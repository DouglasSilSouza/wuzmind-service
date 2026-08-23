import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { IntentEnum } from '../../common/enums/intent.enum';
import { SuggestedActionEnum } from '../../common/enums/suggested-action.enum';

export class IntentClassifyRequestDto {
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

export class IntentClassifyResponseDto {
  intent!: IntentEnum;
  confidence!: number;
  entities!: Record<string, unknown>;
  suggestedAction!: SuggestedActionEnum;
  targetFlow?: string | null;
  provider!: string;
}
