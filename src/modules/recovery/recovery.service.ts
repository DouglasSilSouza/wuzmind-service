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
    for (const opt of availableOptions) {
      if (opt.toLowerCase() === lower) {
        return opt;
      }
    }
    return null;
  }

  async recover(dto: RecoveryRequestDto): Promise<RecoveryResponseDto> {
    const raw = dto.message.trim().toLowerCase();

    // Check if user actually picked one of the options
    const matched = this.matchOptions(dto.message, dto.availableOptions);
    if (matched) {
      return {
        action: SuggestedActionEnum.CONTINUE_TYPEBOT,
        message: `Opção selecionada: ${matched}`,
        matchedOption: matched,
        intent: 'OPCAO_SELECIONADA',
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

    // Pass to AI Providers
    const result = await this.aiProviderManager.recoverConversation(dto);
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
