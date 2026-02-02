import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { query, provider = 'serper' } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (provider === 'tavily') {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) return NextResponse.json({ error: 'TAVILY_API_KEY is not configured' }, { status: 500 });

      console.log(`[Tool:Search] Querying Tavily: ${query}`);
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query: query,
          search_depth: "smart",
          include_answer: true,
          max_results: 5
        }),
      });

      if (!response.ok) throw new Error(`Tavily API error: ${response.status}`);
      const data = await response.json();
      
      const results = data.results?.map((item: any, i: number) => (
        `[${i + 1}] ${item.title}\nLink: ${item.url}\nSnippet: ${item.content}`
      )).join('\n\n') || 'No results found.';

      return NextResponse.json({ results, answer: data.answer });
    } else {
      // Default: Serper
      const apiKey = process.env.SERPER_API_KEY;
      if (!apiKey) return NextResponse.json({ error: 'SERPER_API_KEY is not configured' }, { status: 500 });

      console.log(`[Tool:Search] Querying Serper: ${query}`);
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: query, num: 5 }),
      });

      if (!response.ok) throw new Error(`Serper API error: ${response.status}`);
      const data = await response.json();
      
      const results = data.organic?.map((item: any, i: number) => (
        `[${i + 1}] ${item.title}\nLink: ${item.link}\nSnippet: ${item.snippet}`
      )).join('\n\n') || 'No results found.';

      return NextResponse.json({ results });
    }

  } catch (error: any) {
    console.error('[Tool:Search] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
