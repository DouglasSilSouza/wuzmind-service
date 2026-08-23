#!/usr/bin/env node
/**
 * Diagnostic script: Discovers authorized Gemini models and executes test generation
 * Usage: node scripts/diagnose-gemini.mjs
 */
import 'dotenv/config';

const apiKey = process.env.GEMINI_API_KEY;
const baseUrl = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');

console.log('=== WUZMIND GEMINI DIAGNOSTIC ===');
if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY is not set in environment.');
  process.exit(1);
}

console.log(`Key configured: ${apiKey.slice(0, 6)}... (length: ${apiKey.length})`);
console.log(`Base URL: ${baseUrl}`);

const startDiscovery = Date.now();
try {
  const res = await fetch(`${baseUrl}/models?key=${encodeURIComponent(apiKey)}`);
  const discoveryDuration = Date.now() - startDiscovery;

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Discovery failed with HTTP ${res.status} (${discoveryDuration}ms):`, errText);
    process.exit(1);
  }

  const data = await res.json();
  const models = data.models || [];
  const generateContentModels = models
    .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''));

  console.log(`Discovery completed in ${discoveryDuration}ms.`);
  console.log(`Total models: ${models.length}`);
  console.log(`Models supporting generateContent (${generateContentModels.length}):`);
  generateContentModels.forEach((m) => console.log(`  - ${m}`));

  // Selection policy
  const configured = process.env.GEMINI_MODEL;
  const rawCandidates = process.env.GEMINI_MODEL_CANDIDATES || 'gemini-2.5-flash,gemini-2.5-flash-lite,gemini-1.5-flash,gemini-2.0-flash';
  const candidates = rawCandidates.split(',').map((c) => c.trim()).filter(Boolean);

  let selected = null;
  if (configured && generateContentModels.includes(configured.replace(/^models\//, ''))) {
    selected = configured.replace(/^models\//, '');
    console.log(`\nSelected via GEMINI_MODEL: ${selected}`);
  } else {
    for (const c of candidates) {
      if (generateContentModels.includes(c)) {
        selected = c;
        console.log(`\nSelected via GEMINI_MODEL_CANDIDATES: ${selected}`);
        break;
      }
    }
  }

  if (!selected) {
    const flash = generateContentModels.find((m) => m.includes('flash'));
    selected = flash || generateContentModels[0];
    console.log(`\nSelected via fallback Flash discovery: ${selected}`);
  }

  if (!selected) {
    console.error('ERROR: No valid generateContent model found.');
    process.exit(1);
  }

  console.log(`\nTesting generation on model '${selected}'...`);
  const startGen = Date.now();
  const genRes = await fetch(`${baseUrl}/models/${selected}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Responda estritamente em JSON: {"status": "ok", "message": "hello"}' }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 100,
        responseMimeType: 'application/json',
      },
    }),
  });
  const genDuration = Date.now() - startGen;

  if (!genRes.ok) {
    const errText = await genRes.text();
    console.error(`Generation failed with HTTP ${genRes.status} (${genDuration}ms):`, errText);
    process.exit(1);
  }

  const genData = await genRes.json();
  const text = genData?.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log(`Generation SUCCESS in ${genDuration}ms!`);
  console.log('Response content:', text);
  console.log('=== DIAGNOSTIC COMPLETE: GEMINI IS READY ===');
} catch (err) {
  console.error('Diagnostic error:', err.message);
  process.exit(1);
}
