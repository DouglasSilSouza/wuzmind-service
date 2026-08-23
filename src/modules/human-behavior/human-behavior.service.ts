import { Injectable } from '@nestjs/common';
import { HumanBehaviorCategoryEnum } from '../common/enums/human-behavior-category.enum';
import { DetectHumanBehaviorDto, HumanBehaviorResponseDto } from './dto/human-behavior.dto';

interface RuleMatch {
  category: HumanBehaviorCategoryEnum;
  patterns: RegExp[];
  suggestedMessage: string;
}

@Injectable()
export class HumanBehaviorService {
  private readonly rules: RuleMatch[] = [
    {
      category: HumanBehaviorCategoryEnum.GREETING,
      patterns: [
        /^(oi|ol[aá]|bom dia|boa tarde|boa noite|e a[ií]|fala a[ií]|salve|opa|oie|ola|hello|hey)[!.]*$/i,
        /^(oi|ol[aá]|bom dia|boa tarde|boa noite)[,\s]+(tudo bem|beleza|como vai|td bem)[?.]*$/i,
      ],
      suggestedMessage: 'Olá! Posso ajudar com gastos, entradas e relatórios.',
    },
    {
      category: HumanBehaviorCategoryEnum.THANKS,
      patterns: [
        /^(obrigad[oa]|valeu|vlw|agrade[cç]o|muito obrigad[oa]|tmj|obg)[!.]*$/i,
      ],
      suggestedMessage: 'Por nada! Se precisar de mais alguma coisa, estou por aqui.',
    },
    {
      category: HumanBehaviorCategoryEnum.LAUGHTER,
      patterns: [
        /^(k{2,}|ha(ha)+|he(he)+|rs(rs)+|kkk+)[!.]*$/i,
      ],
      suggestedMessage: '😄 Se precisar registrar algo ou ver relatórios, só me avisar!',
    },
    {
      category: HumanBehaviorCategoryEnum.FAREWELL,
      patterns: [
        /^(tchau|at[eé] mais|at[eé] logo|falou|flw|adeus|at[eé] amanh[aã])[!.]*$/i,
      ],
      suggestedMessage: 'Até mais! Quando precisar gerenciar suas finanças, estou à disposição.',
    },
    {
      category: HumanBehaviorCategoryEnum.CONFIRMATION,
      patterns: [
        /^(beleza|blz|ok|certo|fechado|combinado|perfeito|tranquilo)[!.]*$/i,
      ],
      suggestedMessage: 'Beleza! Digite MENU a qualquer momento para ver as opções.',
    },
  ];

  public matchRule(text: string): { isMatch: boolean; category: HumanBehaviorCategoryEnum | null; suggestedMessage: string | null } {
    if (!text || typeof text !== 'string') {
      return { isMatch: false, category: null, suggestedMessage: null };
    }

    const normalized = text.trim();
    for (const rule of this.rules) {
      for (const pattern of rule.patterns) {
        if (pattern.test(normalized)) {
          return {
            isMatch: true,
            category: rule.category,
            suggestedMessage: rule.suggestedMessage,
          };
        }
      }
    }

    return { isMatch: false, category: null, suggestedMessage: null };
  }

  detect(dto: DetectHumanBehaviorDto): HumanBehaviorResponseDto {
    const local = this.matchRule(dto.message);
    if (local.isMatch) {
      return {
        isHumanBehavior: true,
        category: local.category,
        suggestedMessage: local.suggestedMessage,
      };
    }

    return {
      isHumanBehavior: false,
      category: null,
      suggestedMessage: null,
    };
  }
}
