import { IsNotEmpty, IsString } from 'class-validator';
import { HumanBehaviorCategoryEnum } from '../../common/enums/human-behavior-category.enum';

export class DetectHumanBehaviorDto {
  @IsNotEmpty()
  @IsString()
  message!: string;
}

export class HumanBehaviorResponseDto {
  isHumanBehavior!: boolean;
  category!: HumanBehaviorCategoryEnum | null;
  suggestedMessage?: string | null;
}
