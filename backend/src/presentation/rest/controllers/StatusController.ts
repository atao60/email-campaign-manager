import { Controller, Get, Route, SuccessResponse, Res, type TsoaResponse } from 'tsoa';

import { GetCampaignStatusUseCase } from '@application/usecases';
import { type CampaignStatus } from '@domain/models/CampaignStatus';

@Route('api/status')
export class StatusController extends Controller {
  constructor(private readonly getStatusUseCase: GetCampaignStatusUseCase) {
    super();
  }

  @Get('/')
  @SuccessResponse('200', 'OK')
  public async getCampaignStatus(@Res() serverError: TsoaResponse<500, { error: string }>): Promise<CampaignStatus> {
    try {
      return await this.getStatusUseCase.execute();
    } catch (error) {
      console.error(`Failed to fetch status: ${error}`);
      return serverError(500, { error: 'Failed to fetch status' });
    }
  }
}
