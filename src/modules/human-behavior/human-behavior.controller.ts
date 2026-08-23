import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/auth/api-key.guard';
import { HumanBehaviorService } from './human-behavior.service';
import { DetectHumanBehaviorDto, HumanBehaviorResponseDto } from './dto/human-behavior.dto';

@Controller('v1/human-behavior')
@UseGuards(ApiKeyGuard)
export class HumanBehaviorController {
  constructor(private readonly humanBehaviorService: HumanBehaviorService) {}

  @Post('detect')
  @HttpCode(HttpStatus.OK)
  detect(@Body() dto: DetectHumanBehaviorDto): HumanBehaviorResponseDto {
    return this.humanBehaviorService.detect(dto);
  }
}
