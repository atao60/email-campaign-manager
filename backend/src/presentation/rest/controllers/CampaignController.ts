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
  FormField
} from 'tsoa';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

import type { CampaignSummary, CampaignDetail, LaunchCampaignResponse } from '../dto/CampaignDTO';
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
}

interface BaseSendCampaignPayload {
  contactsFilePath: string;
  subject: string;
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
      await this.mergeUseCase.execute(requestBody.inputs, requestBody.output);
      return { message: `Successfully merged lists into ${requestBody.output}` };
    } catch (error) {
      console.error('Internal Server Error during merge: ', error);
      return serverError(500, { error: 'Internal Server Error during merge.' });
    }
  }

  @Post('send')
  public async launchCampaign(
    // ==========================================
    // 1. RESPONDERS (Outputs - Required)
    // ==========================================
    @Res() serverError: TsoaResponse<500, { error: string }>,
    @Res() validationError: TsoaResponse<400, { error: string }>,
    @Res() acceptedResponse: TsoaResponse<202, LaunchCampaignResponse>,

    // ==========================================
    // 2. FORM DATA (Inputs - Required first, Optional last)
    // ==========================================
    @UploadedFile() contactsCsv: Express.Multer.File,
    @FormField() subject: string,
    @FormField() templateHtml?: string,
    @FormField() templateUrl?: string
  ) {
    try {
      console.log('CampaignController.launchCampaign starting');
      // 🛑 TEST:
      console.log('🚨 [CONTROLLER HIT] The frontend successfully reached launchCampaign!');
      console.log('Subject received:', subject);
      console.log('File received:', contactsCsv ? 'Yes' : 'No');
      let finalHtmlContent: string;

      if (templateHtml) {
        finalHtmlContent = templateHtml;
      } else if (templateUrl) {
        return validationError(400, { error: 'URL fetching is not yet implemented.' });
      } else {
        return validationError(400, { error: 'Must provide either templateHtml or templateUrl' });
      }

      // 2. Handle the uploaded file
      // Because your use case expects a file path, we must temporarily write the uploaded buffer to disk.
      // (Make sure to import * as fs from 'fs' and * as path from 'path' at the top of your file)
      const tmpDir = join(cwd(), 'tmp');
      if (!existsSync(tmpDir)) {
        mkdirSync(tmpDir, { recursive: true });
      }
      const tempFilePath = join(tmpDir, `upload-${Date.now()}.csv`);
      writeFileSync(tempFilePath, contactsCsv.buffer);

      // 3. Execute the business logic using the temporary file path
      const processedCount = await this.sendCampaignUseCase.execute(tempFilePath, subject, { html: finalHtmlContent });

      // (Optional but recommended) Clean up the temp file after the queue accepts it
      // fs.unlinkSync(tempFilePath);

      return acceptedResponse(202, {
        message: `Campaign for ${subject} has been queued for sending.`,
        processed: processedCount
      });
    } catch (error: unknown) {
      console.error(`Launch campaign error:`, error);
      return serverError(500, { error: 'Internal Server Error while queueing campaign.' });
    }
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
