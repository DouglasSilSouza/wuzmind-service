import { Injectable } from '@nestjs/common';
import { IntentEnum } from '../common/enums/intent.enum';
import { SuggestedActionEnum } from '../common/enums/suggested-action.enum';
import { AiProviderManager } from '../ai/ai-provider.manager';
import { PromptInjectionGuard } from '../common/security/prompt-injection-guard';
import { IntentClassifyRequestDto, IntentClassifyResponseDto } from './dto/intent-classify.dto';
import { HumanBehaviorService } from '../human-behavior/human-behavior.service';

@Injectable()
export class IntentRouterService {
  constructor(
    private readonly aiProviderManager: AiProviderManager,
    private readonly humanBehaviorService: HumanBehaviorService,
  ) {}

  private checkLocalRules(dto: IntentClassifyRequestDto): IntentClassifyResponseDto | null {
    const raw = (dto.message || dto.text || '').trim().toLowerCase();

    // 1. Prompt injection guard
    if (PromptInjectionGuard.containsInjection(raw)) {
      return {
        intent: IntentEnum.FORA_DE_ESCOPO,
        confidence: 1.0,
        entities: {},
        suggestedAction: SuggestedActionEnum.REDISPLAY_MENU,
        targetFlow: null,
        provider: 'LOCAL_SECURITY_RULE',
      };
    }

    // 2. Global command: MENU
    if (/^(menu|in[ií]cio|reiniciar|voltar ao come[cç]o|recome[cç]ar|voltar)$/i.test(raw)) {
      return {
        intent: IntentEnum.MENU,
        confidence: 1.0,
        entities: {},
        suggestedAction: SuggestedActionEnum.REDISPLAY_MENU,
        targetFlow: 'MAIN_MENU',
        provider: 'LOCAL_RULE',
      };
    }

    // 3. Global command: SAIR
    if (/^(sair|cancelar|encerrar|finalizar|parar|fechar)$/i.test(raw)) {
      return {
        intent: IntentEnum.SAIR,
        confidence: 1.0,
        entities: {},
        suggestedAction: SuggestedActionEnum.END_SESSION,
        targetFlow: null,
        provider: 'LOCAL_RULE',
      };
    }

    // 4. Global command: AJUDA
    if (/^(ajuda|help|como funciona|socorro|suporte|d[uú]vida)$/i.test(raw)) {
      return {
        intent: IntentEnum.AJUDA,
        confidence: 1.0,
        entities: {},
        suggestedAction: SuggestedActionEnum.ANSWER_AND_KEEP_STATE,
        targetFlow: null,
        provider: 'LOCAL_RULE',
      };
    }

    // 5. Global command: CONTINUAR
    if (/^(continuar|retomar|seguir|prosseguir)$/i.test(raw)) {
      return {
        intent: IntentEnum.CONTINUAR,
        confidence: 1.0,
        entities: {},
        suggestedAction: SuggestedActionEnum.CONTINUE_TYPEBOT,
        targetFlow: null,
        provider: 'LOCAL_RULE',
      };
    }

    // 6. Direct match with available options (exact case-insensitive)
    if (dto.availableOptions && dto.availableOptions.length > 0) {
      const match = dto.availableOptions.find(
        (opt) => opt.trim().toLowerCase() === raw
      );
      if (match) {
        return {
          intent: IntentEnum.CONTINUAR,
          confidence: 1.0,
          entities: { selectedOption: match },
          suggestedAction: SuggestedActionEnum.CONTINUE_TYPEBOT,
          targetFlow: null,
          provider: 'LOCAL_OPTION_MATCH',
        };
      }
    }

    // 7. Human behavior match (greeting/thanks)
    const human = this.humanBehaviorService.matchRule(raw);
    if (human.isMatch) {
      return {
        intent: IntentEnum.CONVERSA_GERAL,
        confidence: 0.98,
        entities: { category: human.category },
        suggestedAction: SuggestedActionEnum.ANSWER_AND_KEEP_STATE,
        targetFlow: null,
        provider: 'LOCAL_HUMAN_RULE',
      };
    }

    return null;
  }

  async classify(dto: IntentClassifyRequestDto): Promise<IntentClassifyResponseDto> {
    const local = this.checkLocalRules(dto);
    if (local) {
      return local;
    }

    const raw = dto.message || dto.text || '';
    const sanitizedMessage = PromptInjectionGuard.sanitize(raw);
    const result = await this.aiProviderManager.classifyIntent({
      ...dto,
      message: sanitizedMessage,
    });

    return {
      intent: result.intent,
      confidence: result.confidence,
      entities: result.entities,
      suggestedAction: result.suggestedAction,
      targetFlow: result.targetFlow,
      provider: result.provider,
    };
  }
}
