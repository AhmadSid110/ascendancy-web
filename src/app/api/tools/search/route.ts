import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    const apiKey = process.env.SERPER_API_KEY;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'SERPER_API_KEY is not configured on server' }, { status: 500 });
    }

    console.log(`[Tool:Search] Querying: ${query}`);

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 5 }),
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Format results into a concise string for the LLM
    const results = data.organic?.map((item: any, i: number) => (
      `[${i + 1}] ${item.title}\nLink: ${item.link}\nSnippet: ${item.snippet}`
    )).join('\n\n') || 'No results found.';

    return NextResponse.json({ results });

  } catch (error: any) {
    console.error('[Tool:Search] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
