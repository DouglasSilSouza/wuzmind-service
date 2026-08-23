import { RecoveryRequest } from '../ai.types';

export function buildRecoveryPrompt(request: RecoveryRequest): string {
  const optionsText = request.availableOptions && request.availableOptions.length > 0
    ? request.availableOptions.map((o) => `- ${o}`).join('\n')
    : 'Nenhuma';

  return [
    'Você é o assistente WuzMind para o sistema de gestão financeira via WhatsApp.',
    'O usuário está no meio de um fluxo conversacional e enviou uma mensagem livre (fora do escopo exato dos botões).',
    '',
    'SUA MISSÃO:',
    'Analisar a intenção da mensagem e decidir se ela corresponde semanticamente a alguma das "Opções válidas" atuais ou se está totalmente fora de contexto.',
    '',
    'DIRETRIZES:',
    '1. CORRESPONDÊNCIA SEMÂNTICA: Se o usuário digitou algo parecido com uma das opções (ex: "Gastos" para "🎰Registrar", ou "Resumo" para "📊 Relatórios"), retorne action: "CONTINUE_TYPEBOT".',
    '2. EXATIDÃO DO MATCH: O campo "matchedOption" DEVE ser uma cópia EXATA e IDÊNTICA da opção válida correspondente, incluindo TODOS os emojis e espaços originais.',
    '3. MENSAGEM CURTA: Se precisar orientar o usuário, use no máximo 2 frases.',
    '4. FORA DE CONTEXTO: Se não tiver relação com nenhuma opção, retorne action: "REDISPLAY_MENU" instruindo o usuário a escolher uma das opções ou digitar MENU.',
    '5. Responda ESTRITAMENTE em JSON válido.',
    '',
    'ESTADO ATUAL:',
    `- Estado da conversa: ${request.currentState || 'DESCONHECIDO'}`,
    `- Aguardando resposta para: ${request.waitingFor || 'DESCONHECIDO'}`,
    '- Opções válidas:',
    optionsText,
    '',
    'MENSAGEM DO USUÁRIO:',
    `"${request.message}"`,
    '',
    'EXEMPLOS DE RESPOSTA EM JSON (ESCOLHA APENAS UM):',
    '',
    'CENÁRIO 1: A mensagem bate com uma opção:',
    '{',
    '  "action": "CONTINUE_TYPEBOT",',
    '  "message": "Entendido! Vamos lá.",',
    '  "matchedOption": "🎰Registrar",',
    '  "intent": "ESCOLHA_MENU",',
    '  "confidence": 0.95',
    '}',
    '',
    'CENÁRIO 2: A mensagem não tem nada a ver com as opções:',
    '{',
    '  "action": "REDISPLAY_MENU",',
    '  "message": "No momento, preciso que você escolha uma das opções acima. Se quiser recomeçar, digite MENU.",',
    '  "matchedOption": null,',
    '  "intent": "AJUDA_CONTEXTO",',
    '  "confidence": 0.90',
    '}'
  ].join('\n');
}
