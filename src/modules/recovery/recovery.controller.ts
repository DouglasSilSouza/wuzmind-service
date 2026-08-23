import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/auth/api-key.guard';
import { RecoveryService } from './recovery.service';
import { RecoveryRequestDto, RecoveryResponseDto } from './dto/recovery.dto';

@Controller('v1/recovery')
@UseGuards(ApiKeyGuard)
export class RecoveryController {
  constructor(private readonly recoveryService: RecoveryService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async recover(@Body() dto: RecoveryRequestDto): Promise<RecoveryResponseDto> {
    return this.recoveryService.recover(dto);
  }
}
