import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'node:crypto';

const CLIENTS: Record<string, { id: string, scopes: string[] }> = {
  antigravity: {
    id: "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com",
    scopes: [
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/cclog",
      "https://www.googleapis.com/auth/experimentsandconfigs"
    ]
  },
  cli: {
    id: "681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com",
    scopes: [
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile"
    ]
  }
};

export async function POST(req: Request) {
  try {
    const { provider = 'antigravity', redirectUri } = await req.json();
    const client = CLIENTS[provider];

    if (!client) return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });

    const verifier = randomBytes(32).toString('hex');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const state = randomBytes(16).toString('hex');

    const params = new URLSearchParams({
      client_id: client.id,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: client.scopes.join(" "),
      code_challenge: challenge,
      code_challenge_method: "S256",
      state: state,
      access_type: "offline",
      prompt: "consent",
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return NextResponse.json({ url, verifier, state });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
