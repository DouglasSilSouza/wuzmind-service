import { Injectable } from '@nestjs/common';
import { AiProvider } from '../ai/ai-provider.interface';
import {
  IntentClassificationRequest,
  IntentClassificationResult,
  RecoveryRequest,
  RecoveryResult,
  MediaClassificationRequest,
  MediaClassificationResult,
} from '../ai/ai.types';
import { IntentEnum } from '../common/enums/intent.enum';
import { SuggestedActionEnum } from '../common/enums/suggested-action.enum';
import { MediaClassificationEnum } from '../common/enums/media-classification.enum';

@Injectable()
export class StaticFallbackProvider implements AiProvider {
  readonly name = 'STATIC';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async classifyIntent(
    _request: IntentClassificationRequest
  ): Promise<IntentClassificationResult> {
    return {
      intent: IntentEnum.DESCONHECIDA,
      confidence: 0,
      entities: {},
      suggestedAction: SuggestedActionEnum.REDISPLAY_MENU,
      targetFlow: null,
      provider: this.name,
    };
  }

  async recoverConversation(
    _request: RecoveryRequest
  ): Promise<RecoveryResult> {
    return {
      action: SuggestedActionEnum.REDISPLAY_MENU,
      message: 'Não consegui entender. Escolha uma das opções disponíveis ou digite MENU para recomeçar.',
      matchedOption: null,
      intent: 'DESCONHECIDA',
      confidence: 0.1,
      provider: this.name,
    };
  }

  async classifyMedia(
    request: MediaClassificationRequest
  ): Promise<MediaClassificationResult> {
    const isAudio = request.mediaType === 'AUDIO' || (request.mimeType && request.mimeType.startsWith('audio/'));
    if (isAudio) {
      return {
        classification: MediaClassificationEnum.AUDIO_DESPESA,
        confidence: 0.5,
        suggestedAction: SuggestedActionEnum.SEND_TO_N8N_TRANSCRIPTION,
        provider: this.name,
      };
    }

    return {
      classification: MediaClassificationEnum.COMPROVANTE,
      confidence: 0.4,
      suggestedAction: SuggestedActionEnum.SEND_TO_N8N_OCR,
      provider: this.name,
    };
  }
}
