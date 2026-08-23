import { Injectable } from '@nestjs/common';
import { SuggestedActionEnum } from '../common/enums/suggested-action.enum';
import { AiProviderManager } from '../ai/ai-provider.manager';
import { RecoveryRequestDto, RecoveryResponseDto } from './dto/recovery.dto';

@Injectable()
export class RecoveryService {
  constructor(private readonly aiProviderManager: AiProviderManager) {}

  private matchOptions(message: string, availableOptions?: string[]): string | null {
    if (!availableOptions || availableOptions.length === 0) return null;
    const lower = message.trim().toLowerCase();
    const normalizedInput = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Number index (e.g. "1", "2")
    const num = parseInt(lower, 10);
    if (!isNaN(num) && num >= 1 && num <= availableOptions.length) {
      return availableOptions[num - 1];
    }

    for (const opt of availableOptions) {
      const normOpt = opt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normOpt === normalizedInput || normOpt.includes(normalizedInput) || normalizedInput.includes(normOpt)) {
        return opt;
      }
    }
    return null;
  }

  async recover(dto: RecoveryRequestDto): Promise<RecoveryResponseDto> {
    const messageText = (dto.message || dto.text || '').trim();
    const raw = messageText.toLowerCase();

    // Direct match against available options
    const matched = this.matchOptions(messageText, dto.availableOptions);
    if (matched) {
      return {
        action: SuggestedActionEnum.CONTINUE_TYPEBOT,
        message: `Entendido! Selecionando ${matched}...`,
        matchedOption: matched,
        intent: 'ESCOLHA_MENU',
        confidence: 1.0,
        provider: 'LOCAL_MATCH',
      };
    }

    // Check for MENU command
    if (/^(menu|in[ií]cio|reiniciar|voltar ao come[cç]o)$/i.test(raw)) {
      return {
        action: SuggestedActionEnum.REDISPLAY_MENU,
        message: 'Voltando ao menu principal.',
        matchedOption: null,
        intent: 'MENU',
        confidence: 1.0,
        provider: 'LOCAL_RULE',
      };
    }

    // Pass to AI Providers with fast failover
    const result = await this.aiProviderManager.recoverConversation({
      phone: dto.phone,
      message: messageText,
      currentState: dto.currentState,
      waitingFor: dto.waitingFor,
      availableOptions: dto.availableOptions,
      context: dto.context,
    });

    return {
      action: result.action,
      message: result.message,
      matchedOption: result.matchedOption,
      intent: result.intent,
      confidence: result.confidence,
      provider: result.provider,
    };
  }
}
