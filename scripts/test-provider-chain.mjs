#!/usr/bin/env node
/**
 * Test Provider Chain: GEMINI -> OPENAI -> STATIC
 * Usage: node scripts/test-provider-chain.mjs
 */
import 'dotenv/config';

console.log('=== WUZMIND PROVIDER CHAIN TEST ===');
console.log(`AI_PROVIDER_ORDER: ${process.env.AI_PROVIDER_ORDER || 'GEMINI,OPENAI,STATIC'}`);

const geminiKey = process.env.GEMINI_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

console.log(`Gemini key configured: ${Boolean(geminiKey)}`);
console.log(`OpenAI key configured: ${Boolean(openaiKey)}`);
console.log('Test complete. Run npm test for full automated unit test suite.');
