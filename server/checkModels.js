import { GoogleGenAI } from '@google/genai';
import { env } from './src/config/env.js';

const ai = new GoogleGenAI({ apiKey: env.gemini.apiKey });

async function testModel(modelName) {
  console.log(`Testing ${modelName}...`);
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: 'Respond with the word SUCCESS',
    });
    console.log(`[${modelName}] Success:`, response.text);
  } catch (err) {
    console.error(`[${modelName}] Error:`, err.message);
  }
}

async function run() {
  await testModel('gemini-2.5-flash');
  await testModel('gemini-flash-latest');
  await testModel('gemini-3.5-flash');
}
run();
