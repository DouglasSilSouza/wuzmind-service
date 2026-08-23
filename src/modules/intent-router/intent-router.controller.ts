import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/auth/api-key.guard';
import { IntentRouterService } from './intent-router.service';
import { IntentClassifyRequestDto, IntentClassifyResponseDto } from './dto/intent-classify.dto';

@Controller('v1/intent')
@UseGuards(ApiKeyGuard)
export class IntentRouterController {
  constructor(private readonly intentRouterService: IntentRouterService) {}

  @Post('classify')
  @HttpCode(HttpStatus.OK)
  async classify(@Body() dto: IntentClassifyRequestDto): Promise<IntentClassifyResponseDto> {
    return this.intentRouterService.classify(dto);
  }
}
