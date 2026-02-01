import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, model, apiKey, includeReasoning } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: { message: 'API Key is missing' } }, { status: 400 });
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    // Prepare body
    const body: any = {
      model: model,
      messages: [{ role: 'user', content: prompt }],
    };

    // If it's a "thinking" model or reasoning is requested, we might need specific flags
    // for different providers. Since this goes to lightning.ai, we follow their spec.
    // For now, we assume it's a standard OpenAI-compatible call.
    
    const response = await fetch('https://lightning.ai/api/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // Extract reasoning if available (OpenAI/Anthropic compatible formats)
    if (data.choices && data.choices[0].message) {
      const msg = data.choices[0].message;
      // Some providers put reasoning in reasoning_content or thinking
      if (!msg.reasoning && msg.reasoning_content) {
        msg.reasoning = msg.reasoning_content;
      }
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: { message: error.message || 'Internal Server Error' } }, { status: 500 });
  }
}
