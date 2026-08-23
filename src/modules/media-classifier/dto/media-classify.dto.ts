import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MediaClassificationEnum } from '../../common/enums/media-classification.enum';
import { SuggestedActionEnum } from '../../common/enums/suggested-action.enum';

export class MediaClassifyRequestDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsNotEmpty()
  @IsString()
  mediaType!: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  url?: string;
}

export class MediaClassifyResponseDto {
  classification!: MediaClassificationEnum;
  confidence!: number;
  suggestedAction!: SuggestedActionEnum;
  provider!: string;
}
