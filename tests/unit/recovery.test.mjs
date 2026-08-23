import test from 'node:test';
import assert from 'node:assert/strict';
import { RecoveryService } from '../../dist/modules/recovery/recovery.service.js';
import { SuggestedActionEnum } from '../../dist/modules/common/enums/suggested-action.enum.js';

test('RecoveryService - Matches valid option directly', async () => {
  const mockAiManager = { recoverConversation: async () => assert.fail('Should match option locally') };
  const service = new RecoveryService(mockAiManager);

  const res = await service.recover({
    message: 'Mês Atual',
    currentState: 'WAITING_MONTH',
    waitingFor: 'RELATORIO_MES',
    availableOptions: ['Mês Atual', 'Mês Anterior', 'Mês Seguinte'],
  });

  assert.equal(res.action, SuggestedActionEnum.CONTINUE_TYPEBOT);
  assert.equal(res.matchedOption, 'Mês Atual');
  assert.equal(res.provider, 'LOCAL_MATCH');
});

test('RecoveryService - Fallback to AI provider for out of flow questions', async () => {
  const mockAiManager = {
    recoverConversation: async () => ({
      action: SuggestedActionEnum.REDISPLAY_MENU,
      message: 'No momento, preciso que você escolha o período do relatório. Se quiser recomeçar, digite MENU.',
      matchedOption: null,
      intent: 'AJUDA_CONTEXTO',
      confidence: 0.91,
      provider: 'OLLAMA',
    }),
  };

  const service = new RecoveryService(mockAiManager);

  const res = await service.recover({
    message: 'como vejo meu saldo?',
    currentState: 'WAITING_MONTH',
    waitingFor: 'RELATORIO_MES',
    availableOptions: ['Mês Atual', 'Mês Anterior', 'Mês Seguinte'],
  });

  assert.equal(res.action, SuggestedActionEnum.REDISPLAY_MENU);
  assert.equal(res.provider, 'OLLAMA');
  assert.ok(res.message.includes('período do relatório'));
});
