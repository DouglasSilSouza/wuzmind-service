import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContextEntity } from '../../database/entities/context.entity';
import { ContextService } from './context.service';
import { ContextController } from './context.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ContextEntity])],
  providers: [ContextService],
  controllers: [ContextController],
  exports: [ContextService],
})
export class ContextModule {}
