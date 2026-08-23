import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../common/auth/public.decorator';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  @Public()
  async getHealth() {
    return this.healthService.checkHealth();
  }

  @Get()
  @Public()
  getRoot() {
    return {
      service: 'wuzmind-service',
      version: '0.1.0',
      status: 'online',
      documentation: 'https://github.com/DouglasSilSouza/wuzmind-service',
      healthCheck: '/health',
      endpoints: {
        health: 'GET /health',
        intentClassify: 'POST /v1/intent/classify',
        humanBehaviorDetect: 'POST /v1/human-behavior/detect',
        recovery: 'POST /v1/recovery',
        mediaClassify: 'POST /v1/media/classify',
        context: 'GET|PUT|DELETE /v1/context/:phone',
      },
    };
  }

  @Get('favicon.ico')
  @Public()
  getFavicon(@Res() res: Response) {
    return res.status(HttpStatus.NO_CONTENT).send();
  }
}
