import test from 'node:test';
import assert from 'node:assert/strict';
import { HumanBehaviorService } from '../../dist/modules/human-behavior/human-behavior.service.js';
import { HumanBehaviorCategoryEnum } from '../../dist/modules/common/enums/human-behavior-category.enum.js';

test('HumanBehaviorService - Greetings detection', () => {
  const service = new HumanBehaviorService();

  const cases = ['oi', 'Olá', 'bom dia', 'boa tarde', 'boa noite', 'e aí', 'fala aí', 'salve!'];
  for (const msg of cases) {
    const res = service.detect({ message: msg });
    assert.equal(res.isHumanBehavior, true, `Failed for ${msg}`);
    assert.equal(res.category, HumanBehaviorCategoryEnum.GREETING);
    assert.ok(res.suggestedMessage);
  }
});

test('HumanBehaviorService - Thanks, laughter, farewells', () => {
  const service = new HumanBehaviorService();

  // Thanks
  const thanksRes = service.detect({ message: 'muito obrigado!' });
  assert.equal(thanksRes.isHumanBehavior, true);
  assert.equal(thanksRes.category, HumanBehaviorCategoryEnum.THANKS);

  // Laughter
  const laughterRes = service.detect({ message: 'kkkkk' });
  assert.equal(laughterRes.isHumanBehavior, true);
  assert.equal(laughterRes.category, HumanBehaviorCategoryEnum.LAUGHTER);

  // Farewell
  const farewellRes = service.detect({ message: 'tchau' });
  assert.equal(farewellRes.isHumanBehavior, true);
  assert.equal(farewellRes.category, HumanBehaviorCategoryEnum.FAREWELL);

  // Non-human behavior (financial intent)
  const financeRes = service.detect({ message: 'gastei 50 reais no almoço' });
  assert.equal(financeRes.isHumanBehavior, false);
  assert.equal(financeRes.category, null);
});
