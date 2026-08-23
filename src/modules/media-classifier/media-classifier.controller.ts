import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/auth/api-key.guard';
import { MediaClassifierService } from './media-classifier.service';
import { MediaClassifyRequestDto, MediaClassifyResponseDto } from './dto/media-classify.dto';

@Controller('v1/media')
@UseGuards(ApiKeyGuard)
export class MediaClassifierController {
  constructor(private readonly mediaClassifierService: MediaClassifierService) {}

  @Post('classify')
  @HttpCode(HttpStatus.OK)
  async classify(@Body() dto: MediaClassifyRequestDto): Promise<MediaClassifyResponseDto> {
    return this.mediaClassifierService.classify(dto);
  }
}
