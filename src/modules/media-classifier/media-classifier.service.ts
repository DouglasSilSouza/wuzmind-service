import { Injectable } from '@nestjs/common';
import { MediaClassificationEnum } from '../common/enums/media-classification.enum';
import { SuggestedActionEnum } from '../common/enums/suggested-action.enum';
import { AiProviderManager } from '../ai/ai-provider.manager';
import { MediaClassifyRequestDto, MediaClassifyResponseDto } from './dto/media-classify.dto';

@Injectable()
export class MediaClassifierService {
  constructor(private readonly aiProviderManager: AiProviderManager) {}

  private checkLocalHeuristics(dto: MediaClassifyRequestDto): MediaClassifyResponseDto | null {
    const text = `${dto.fileName || ''} ${dto.caption || ''}`.toLowerCase();

    if (/comprovante|pagamento|transfer[eê]ncia|pix|recibo/i.test(text)) {
      return {
        classification: MediaClassificationEnum.COMPROVANTE,
        confidence: 0.95,
        suggestedAction: SuggestedActionEnum.SEND_TO_N8N_OCR,
        provider: 'LOCAL_HEURISTICS',
      };
    }

    if (/fatura|boleto|cart[aã]o/i.test(text)) {
      return {
        classification: MediaClassificationEnum.FATURA,
        confidence: 0.95,
        suggestedAction: SuggestedActionEnum.SEND_TO_N8N_OCR,
        provider: 'LOCAL_HEURISTICS',
      };
    }

    if (/extrato/i.test(text)) {
      return {
        classification: MediaClassificationEnum.EXTRATO,
        confidence: 0.95,
        suggestedAction: SuggestedActionEnum.SEND_TO_N8N_OCR,
        provider: 'LOCAL_HEURISTICS',
      };
    }

    if (dto.mediaType === 'AUDIO' || (dto.mimeType && dto.mimeType.startsWith('audio/'))) {
      return {
        classification: MediaClassificationEnum.AUDIO_DESPESA,
        confidence: 0.90,
        suggestedAction: SuggestedActionEnum.SEND_TO_N8N_TRANSCRIPTION,
        provider: 'LOCAL_HEURISTICS',
      };
    }

    return null;
  }

  async classify(dto: MediaClassifyRequestDto): Promise<MediaClassifyResponseDto> {
    const local = this.checkLocalHeuristics(dto);
    if (local) {
      return local;
    }

    const result = await this.aiProviderManager.classifyMedia(dto);
    return {
      classification: result.classification,
      confidence: result.confidence,
      suggestedAction: result.suggestedAction,
      provider: result.provider,
    };
  }
}
