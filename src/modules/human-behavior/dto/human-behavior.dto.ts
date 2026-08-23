import { IsOptional, IsString } from 'class-validator';
import { HumanBehaviorCategoryEnum } from '../../common/enums/human-behavior-category.enum';

export class DetectHumanBehaviorDto {
  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  text?: string;
}

export class HumanBehaviorResponseDto {
  isHumanBehavior!: boolean;
  category!: HumanBehaviorCategoryEnum | null;
  suggestedMessage?: string | null;
}
