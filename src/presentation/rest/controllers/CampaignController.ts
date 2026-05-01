import { Route, Post, Body, Controller, SuccessResponse, Res, type TsoaResponse } from 'tsoa';

import { type MergeMailingListsUseCase } from '@application/usecases/MergeMailingListsUseCase';
import type { SendCampaignUseCase } from '@application/usecases/SendCampaignUseCase';

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
  constructor(
    private readonly mergeUseCase: MergeMailingListsUseCase,
    private readonly sendCampaignUseCase: SendCampaignUseCase
  ) {
    super();
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

  @Post('send-campaign')
  @SuccessResponse('202', 'Accepted')
  public async sendCampaign(
    @Body() requestBody: SendCampaignPayload,
    @Res() serverError: TsoaResponse<500, { error: string }>,
    @Res() validationError: TsoaResponse<400, { error: string }>
  ): Promise<{ message: string; processed?: number }> {
    try {
      let finalHtmlContent: string;

      // Resolve the HTML content
      if ('templateHtml' in requestBody && requestBody.templateHtml) {
        finalHtmlContent = requestBody.templateHtml;
      } else if ('templateHtmlUrl' in requestBody && requestBody.templateHtmlUrl) {
        // You have two choices here:
        // Choice A: Fetch the HTML string right here in the controller
        // finalHtmlContent = await fetch(requestBody.templateHtmlUrl).then(res => res.text());

        // Choice B (Recommended): Update your Use Case to accept the URL and let the backend handle the fetching.
        // For now, we'll throw an error if your use case isn't ready for URLs yet.
        return validationError(400, { error: 'URL fetching is not yet implemented.' });
      } else {
        // Fallback safety net (though tsoa should catch this automatically)
        return validationError(400, { error: 'Must provide either templateHtml or templateHtmlUrl' });
      }

      // Execute the business logic
      const processedCount = await this.sendCampaignUseCase.execute(
        requestBody.contactsFilePath,
        requestBody.subject,
        { html: finalHtmlContent } //requestBody.templateHtml
      );

      // 202 status implies the request is accepted and processing in the background
      this.setStatus(202);
      return {
        message: `Campaign for ${requestBody.subject} has been queued for sending.`,
        processed: processedCount
      };
    } catch (error: unknown) {
      console.error(`Send campaign error:`, error);
      return serverError(500, { error: 'Internal Server Error while queueing campaign.' });
    }
  }
}
