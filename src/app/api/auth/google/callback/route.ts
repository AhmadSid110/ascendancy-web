import { NextResponse } from 'next/server';

const CLIENTS: Record<string, { id: string, secret?: string }> = {
  antigravity: {
    id: "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com",
    secret: process.env.GOOGLE_ANTIGRAVITY_SECRET
  },
  cli: {
    id: "681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com",
    secret: process.env.GOOGLE_CLI_SECRET
  }
};

export async function POST(req: Request) {
  try {
    const { code, verifier, provider = 'antigravity', redirectUri } = await req.json();
    const client = CLIENTS[provider];

    if (!client) return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: client.id,
        client_secret: client.secret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Token exchange failed: ${text}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
