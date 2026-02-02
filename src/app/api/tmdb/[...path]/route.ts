import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const path = (await params).path.join('/');
    
    // Construct TMDB URL
    const tmdbUrl = new URL(`https://api.themoviedb.org/3/${path}`);
    
    // Append all original search params
    searchParams.forEach((value, key) => {
        tmdbUrl.searchParams.set(key, value);
    });

    console.log(`[TMDB Proxy] Fetching: ${tmdbUrl.toString()}`);

    const response = await fetch(tmdbUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error: any) {
    console.error('[TMDB Proxy] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
