import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, model, apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: { message: 'API Key is missing' } }, { status: 400 });
    }

    const response = await fetch('https://lightning.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: { message: error.message || 'Internal Server Error' } }, { status: 500 });
  }
}
