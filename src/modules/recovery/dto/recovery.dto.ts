import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { SuggestedActionEnum } from '../../common/enums/suggested-action.enum';

export class RecoveryRequestDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsNotEmpty()
  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  currentState?: string | null;

  @IsOptional()
  @IsString()
  waitingFor?: string | null;

  @IsOptional()
  @IsArray()
  availableOptions?: string[];

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

export class RecoveryResponseDto {
  action!: SuggestedActionEnum;
  message!: string;
  matchedOption?: string | null;
  intent!: string;
  confidence!: number;
  provider!: string;
}
