import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../common/auth/api-key.guard';
import { ContextService } from './context.service';
import { UpdateContextDto } from './dto/context.dto';

@Controller('v1/context')
@UseGuards(ApiKeyGuard)
export class ContextController {
  constructor(private readonly contextService: ContextService) {}

  @Get(':phone')
  async getContext(@Param('phone') phone: string) {
    return this.contextService.getOrCreate(phone);
  }

  @Put(':phone')
  @HttpCode(HttpStatus.OK)
  async updateContext(
    @Param('phone') phone: string,
    @Body() dto: UpdateContextDto,
  ) {
    return this.contextService.updateContext(phone, dto);
  }

  @Delete(':phone')
  @HttpCode(HttpStatus.OK)
  async deleteContext(@Param('phone') phone: string) {
    return this.contextService.deleteContext(phone);
  }
}
