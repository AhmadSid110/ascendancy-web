import { NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/appwrite-server';

async function testAI(apiKey: string, model: string, provider: 'lightning' | 'openai') {
  let url = 'https://lightning.ai/api/v1/chat/completions';
  let fullModel = model;

  if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
  } else {
    fullModel = model.startsWith('lightning-ai/') ? model : `lightning-ai/${model}`;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: fullModel,
      messages: [{ role: 'user', content: 'respond with OK' }],
      max_tokens: 5
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status}: ${text}`);
  }

  return await response.json();
}

export async function POST(req: Request) {
  try {
    const { model, apiKey, provider } = await req.json();

    if (!model || !apiKey || !provider) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const start = Date.now();
    await testAI(apiKey, model, provider);
    const latency = Date.now() - start;

    return NextResponse.json({ success: true, latency });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
