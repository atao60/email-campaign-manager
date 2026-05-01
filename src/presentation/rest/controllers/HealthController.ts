import { Controller, Get, Route, SuccessResponse } from 'tsoa';

@Route('health')
export class HealthController extends Controller {
  @Get('/')
  @SuccessResponse('200', 'OK')
  public async getHealth(): Promise<{ status: string }> {
    return { status: 'OK' };
  }
}
