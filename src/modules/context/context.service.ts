import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContextEntity } from '../../database/entities/context.entity';
import { UpdateContextDto } from './dto/context.dto';

@Injectable()
export class ContextService {
  constructor(
    @InjectRepository(ContextEntity)
    private readonly contextRepo: Repository<ContextEntity>,
  ) {}

  async getContext(phone: string): Promise<ContextEntity | null> {
    return this.contextRepo.findOne({ where: { phone } });
  }

  async getOrCreate(phone: string): Promise<ContextEntity> {
    let ctx = await this.getContext(phone);
    if (!ctx) {
      ctx = this.contextRepo.create({
        phone,
        sessionStatus: 'ACTIVE',
        contextData: {},
        lastActivityAt: new Date(),
      });
      await this.contextRepo.save(ctx);
    }
    return ctx;
  }

  async updateContext(phone: string, dto: UpdateContextDto): Promise<ContextEntity> {
    let ctx = await this.getContext(phone);
    if (!ctx) {
      ctx = this.contextRepo.create({
        phone,
        sessionStatus: dto.sessionStatus || 'ACTIVE',
        contextData: dto.contextData || {},
      });
    }

    if (dto.currentState !== undefined) ctx.currentState = dto.currentState;
    if (dto.lastIntent !== undefined) ctx.lastIntent = dto.lastIntent;
    if (dto.lastTypebotGroup !== undefined) ctx.lastTypebotGroup = dto.lastTypebotGroup;
    if (dto.waitingFor !== undefined) ctx.waitingFor = dto.waitingFor;
    if (dto.lastBank !== undefined) ctx.lastBank = dto.lastBank;
    if (dto.lastMonth !== undefined) ctx.lastMonth = dto.lastMonth;
    if (dto.lastFlow !== undefined) ctx.lastFlow = dto.lastFlow;
    if (dto.sessionStatus !== undefined) ctx.sessionStatus = dto.sessionStatus;
    if (dto.contextData !== undefined) {
      ctx.contextData = { ...(ctx.contextData || {}), ...dto.contextData };
    }
    ctx.lastActivityAt = new Date();

    return this.contextRepo.save(ctx);
  }

  async deleteContext(phone: string): Promise<{ success: boolean; message: string }> {
    const result = await this.contextRepo.delete({ phone });
    if (result.affected === 0) {
      throw new NotFoundException(`Context for phone ${phone} not found`);
    }
    return { success: true, message: `Context for ${phone} deleted successfully` };
  }
}
