import {
  Route,
  Post,
  Body,
  Controller,
  SuccessResponse,
  Res,
  type TsoaResponse,
  Get,
  Path,
  UploadedFile,
  UploadedFiles,
  FormField,
  Response as TsoaResponseDoc
} from 'tsoa';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

import type { CampaignSummary, CampaignDetail, LaunchCampaignResponse } from '../dto/CampaignDTO';
import type { EmailAttachmentDto } from '@domain/ports';
import type {
  MergeMailingListsUseCase,
  GetCampaignDetailsUseCase,
  UpdateDeliveryStatusUseCase,
  SendCampaignUseCase,
  GetCampaignsUseCase
} from '@application/usecases/';

interface MergePayload {
  inputs: string[];
  output: string;
  exclusions?: string[];
}

interface BaseSendCampaignPayload {
  contactsFilePath: string;
  subject: string;
  label?: string;
}

export interface SendCampaignHtmlTemplatePayload extends BaseSendCampaignPayload {
  templateHtml: string;
}

export interface SendCampaignHtmlTemplateUrlPayload extends BaseSendCampaignPayload {
  templateHtmlUrl: string;
}

export type SendCampaignPayload = SendCampaignHtmlTemplatePayload | SendCampaignHtmlTemplateUrlPayload;

@Route('campaigns')
export class CampaignController extends Controller {
  private readonly mergeUseCase: MergeMailingListsUseCase;
  private readonly sendCampaignUseCase: SendCampaignUseCase;
  private readonly getCampaignsUseCase: GetCampaignsUseCase;
  private readonly getCampaignDetailsUseCase: GetCampaignDetailsUseCase;
  private readonly updateDeliveryStatusUseCase: UpdateDeliveryStatusUseCase;

  constructor(
    mergeUseCase: MergeMailingListsUseCase,
    sendCampaignUseCase: SendCampaignUseCase,
    getCampaignsUseCase: GetCampaignsUseCase,
    getCampaignDetailsUseCase: GetCampaignDetailsUseCase,
    updateDeliveryStatusUseCase: UpdateDeliveryStatusUseCase
  ) {
    super();
    this.mergeUseCase = mergeUseCase;
    this.sendCampaignUseCase = sendCampaignUseCase;
    this.getCampaignsUseCase = getCampaignsUseCase;
    this.getCampaignDetailsUseCase = getCampaignDetailsUseCase;
    this.updateDeliveryStatusUseCase = updateDeliveryStatusUseCase;
  }

  @Post('merge')
  @SuccessResponse('200', 'Merged')
  public async mergeLists(
    @Body() requestBody: MergePayload,
    @Res() serverError: TsoaResponse<500, { error: string }>
  ): Promise<{ message: string }> {
    try {
      const exclusions = requestBody.exclusions || [];
      await this.mergeUseCase.execute(requestBody.inputs, exclusions, requestBody.output);
      return { message: `Successfully merged lists into ${requestBody.output}` };
    } catch (error) {
      console.error('Internal Server Error during merge: ', error);
      return serverError(500, { error: 'Internal Server Error during merge.' });
    }
  }

  @Post('send')
  @SuccessResponse('202', 'Accepted')
  @TsoaResponseDoc<{ error: string }>('500', 'Internal Server Error')
  public async launchCampaign(
    // RESPONDERS (Outputs - Required)
    @Res() validationError: TsoaResponse<400, { error: string }>,
    // @Res() acceptedResponse: TsoaResponse<202, LaunchCampaignResponse>,

    // FORM DATA (Inputs - Required first, Optional last)
    @UploadedFile('csvFile') contactsCsv: Express.Multer.File, // ---> csvFile
    @FormField() subject: string,
    @FormField() label?: string,
    @FormField('html') templateHtml?: string,
    @FormField('url') templateUrl?: string,
    @UploadedFiles() attachments?: Express.Multer.File[],
    @UploadedFiles() exclusions?: Express.Multer.File[]
  ): Promise<LaunchCampaignResponse> {
    try {
      console.log('CampaignController.launchCampaign starting');
      // 🛑 TEST:
      console.log('🚨 [CONTROLLER HIT] The frontend successfully reached launchCampaign!');
      console.log('Subject received:', subject);
      console.log('Label received:', label);
      console.log('File received:', contactsCsv ? 'Yes' : 'No');
      let finalHtmlContent: string;

      if (templateHtml) {
        finalHtmlContent = templateHtml;
      } else if (templateUrl) {
        return validationError(400, { error: 'URL fetching is not yet implemented.' });
      } else {
        return validationError(400, { error: 'Must provide either HTML template or template URL' });
      }

      // Handle the uploaded file
      // Because your use case expects a file path, we must temporarily write the uploaded buffer to disk.
      // (Make sure to import * as fs from 'fs' and * as path from 'path' at the top of your file)
      const tmpDir = join(cwd(), 'tmp');
      if (!existsSync(tmpDir)) {
        mkdirSync(tmpDir, { recursive: true });
      }

      // Save Master CSV to disk
      const tempCvsFilePath = join(tmpDir, `upload-${Date.now()}.csv`);
      writeFileSync(tempCvsFilePath, contactsCsv.buffer);

      // Process Exclusions (If any)
      const finalTargetCsvPath = await this.processExclusions(tempCvsFilePath, exclusions, tmpDir);
      console.log('CampaignController.launchCampaign, final finalTargetCsvPath: ', finalTargetCsvPath);

      // Process and save Attachments to disk
      const processedAttachments = this.processAttachments(attachments, tmpDir);

      // Execute the business logic using the temporary file path
      const templatePayload = {
        html: finalHtmlContent,
        ...(label && { label }),
        ...(processedAttachments.length > 0 && { attachments: processedAttachments })
      };
      const processedCount = await this.sendCampaignUseCase.execute(finalTargetCsvPath, subject, templatePayload);

      // TBD? Clean up the temp file after the queue accepts it
      // fs.unlinkSync(tempFilePath);

      this.setStatus(202);

      // Return the payload directly!
      return {
        message: `Campaign for ${subject} has been queued for sending.`,
        processed: processedCount
      };
    } catch (error: unknown) {
      console.error(`Launch campaign error:`, error);
      throw new Error('Internal Server Error while queueing campaign.', { cause: error });
    }
  }

  /**
   * Helper: Writes exclusion files to disk and triggers the merge/deduplication use case.
   */
  private async processExclusions(
    masterCsvPath: string,
    exclusions: Express.Multer.File[] | undefined,
    tmpDir: string
  ): Promise<string> {
    if (!exclusions || exclusions.length < 1) {
      return masterCsvPath;
    }

    const exclusionPaths = exclusions.map((file, i) => {
      const exPath = join(tmpDir, `excl-${Date.now()}-${i}.csv`);
      writeFileSync(exPath, file.buffer);
      return exPath;
    });

    const finalTargetCsvPath = join(tmpDir, `filtered-master-${Date.now()}.csv`);
    await this.mergeUseCase.execute([masterCsvPath], exclusionPaths, finalTargetCsvPath);

    return finalTargetCsvPath;
  }

  /**
   * Helper: Writes attachment buffers to disk and maps them to Domain DTOs.
   */
  private processAttachments(attachments: Express.Multer.File[] | undefined, tmpDir: string): EmailAttachmentDto[] {
    if (!attachments || attachments.length === 0) {
      return [];
    }

    return attachments.map((att) => {
      const attPath = join(tmpDir, `att-${Date.now()}-${att.originalname}`);
      writeFileSync(attPath, att.buffer);

      return {
        filename: att.originalname,
        path: attPath,
        cid: att.originalname
      };
    });
  }

  /**
   * Retrieves a high-level list of all processed campaigns.
   */
  @Get('/')
  public async getCampaigns(@Res() serverError: TsoaResponse<500, { error: string }>): Promise<CampaignSummary[]> {
    try {
      return await this.getCampaignsUseCase.execute();
    } catch (error) {
      console.error(`Failed to fetch campaigns:`, error);
      return serverError(500, { error: 'Internal Server Error while fetching campaigns.' });
    }
  }

  /**
   * Retrieves the full details of a specific campaign, including HTML content and email statuses.
   * @param campaignId The unique identifier of the campaign
   */
  @Get('{campaignId}')
  public async getCampaignDetails(
    @Path() campaignId: string,
    @Res() notFoundError: TsoaResponse<404, { error: string }>,
    @Res() serverError: TsoaResponse<500, { error: string }>
  ): Promise<CampaignDetail> {
    try {
      const campaignDetail = await this.getCampaignDetailsUseCase.execute(campaignId);
      console.log('CampaignController.getCampaignDetails, campaignDetail: ', campaignDetail);

      if (!campaignDetail) {
        return notFoundError(404, { error: `Campaign with ID ${campaignId} not found.` });
      }

      return campaignDetail;
    } catch (error) {
      console.error(`Failed to fetch details for campaign ${campaignId}:`, error);
      return serverError(500, { error: 'Internal Server Error while fetching campaign details.' });
    }
  }

  // Example Webhook Endpoint in a Controller
  @Post('webhooks/email-status')
  public async handleEmailProviderWebhook(
    @Body() payload: any // The exact shape depends on the provider (SendGrid, etc.)
  ) {
    // Example: Parsing a theoretical SendGrid webhook payload
    const { campaignId, email, event, reason } = payload;

    const status = ['bounce', 'dropped'].includes(event) ? 'FAILED' : 'OK';

    // Pass the real-world data into your Domain Layer
    await this.updateDeliveryStatusUseCase.execute(campaignId, email, status, reason);

    // Always return 200 OK so the provider knows you received the webhook
    return { success: true };
  }
}
