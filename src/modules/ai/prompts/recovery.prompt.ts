import { RecoveryRequest } from '../ai.types';

export function buildRecoveryPrompt(request: RecoveryRequest): string {
  const optionsText = request.availableOptions && request.availableOptions.length > 0
    ? request.availableOptions.map((o) => `- ${o}`).join('\n')
    : 'Nenhuma';

  return [
    'Você é o assistente WuzMind para o sistema de gestão financeira via WhatsApp.',
    'O usuário está no meio de um fluxo conversacional, mas enviou uma mensagem que não corresponde às opções esperadas ou fez uma pergunta paralela.',
    '',
    'SUA MISSÃO:',
    'Gerar uma resposta curta, cortês e objetiva em português (Brasil) para orientar o usuário a continuar ou reiniciar.',
    '',
    'DIRETRIZES:',
    '1. Resposta curta (máximo 2 frases).',
    '2. Não invente dados financeiros nem simule ter executado ações.',
    '3. Se o usuário estiver perguntando sobre saldo/gastos fora de hora, lembre que ele precisa primeiro responder à pergunta atual ou digitar MENU para recomeçar.',
    '4. Responda ESTRITAMENTE em JSON válido, sem formatação markdown.',
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
    'FORMATO OBRIGATÓRIO DO JSON:',
    '{',
    '  "action": "REDISPLAY_MENU",',
    '  "message": "No momento, preciso que você escolha uma das opções acima. Se quiser recomeçar, digite MENU.",',
    '  "matchedOption": null,',
    '  "intent": "AJUDA_CONTEXTO",',
    '  "confidence": 0.90',
    '}',
  ].join('\n');
}
