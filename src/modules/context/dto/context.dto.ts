import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateContextDto {
  @IsOptional()
  @IsString()
  currentState?: string | null;

  @IsOptional()
  @IsString()
  lastIntent?: string | null;

  @IsOptional()
  @IsString()
  lastTypebotGroup?: string | null;

  @IsOptional()
  @IsString()
  waitingFor?: string | null;

  @IsOptional()
  @IsString()
  lastBank?: string | null;

  @IsOptional()
  @IsString()
  lastMonth?: string | null;

  @IsOptional()
  @IsString()
  lastFlow?: string | null;

  @IsOptional()
  @IsString()
  sessionStatus?: string;

  @IsOptional()
  @IsObject()
  contextData?: Record<string, unknown>;
}
