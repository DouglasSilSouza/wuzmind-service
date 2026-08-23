import test from 'node:test';
import assert from 'node:assert/strict';
import { MediaClassifierService } from '../../dist/modules/media-classifier/media-classifier.service.js';
import { MediaClassificationEnum } from '../../dist/modules/common/enums/media-classification.enum.js';
import { SuggestedActionEnum } from '../../dist/modules/common/enums/suggested-action.enum.js';

test('MediaClassifierService - Local Heuristics for Receipts, Bills, and Audio', async () => {
  const mockAiManager = { classifyMedia: async () => assert.fail('Should use local heuristics') };
  const service = new MediaClassifierService(mockAiManager);

  // Comprovante
  const compRes = await service.classify({
    mediaType: 'IMAGE',
    fileName: 'comprovante_pix.jpg',
    caption: 'pagamento do mercado',
  });
  assert.equal(compRes.classification, MediaClassificationEnum.COMPROVANTE);
  assert.equal(compRes.suggestedAction, SuggestedActionEnum.SEND_TO_N8N_OCR);
  assert.equal(compRes.provider, 'LOCAL_HEURISTICS');

  // Fatura
  const faturaRes = await service.classify({
    mediaType: 'DOCUMENT',
    fileName: 'fatura_cartao_nubank.pdf',
  });
  assert.equal(faturaRes.classification, MediaClassificationEnum.FATURA);
  assert.equal(faturaRes.suggestedAction, SuggestedActionEnum.SEND_TO_N8N_OCR);

  // Audio
  const audioRes = await service.classify({
    mediaType: 'AUDIO',
    mimeType: 'audio/ogg',
  });
  assert.equal(audioRes.classification, MediaClassificationEnum.AUDIO_DESPESA);
  assert.equal(audioRes.suggestedAction, SuggestedActionEnum.SEND_TO_N8N_TRANSCRIPTION);
});
