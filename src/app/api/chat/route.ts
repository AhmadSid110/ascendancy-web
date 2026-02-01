import { NextResponse } from 'next/server';
import { createSessionClient, createAdminClient } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

export async function POST(req: Request) {
  try {
    const { prompt, model, includeReasoning } = await req.json();

    // 1. Authenticate user using their session cookie
    let user;
    try {
      const { account } = await createSessionClient();
      user = await account.get();
    } catch (e) {
      return NextResponse.json({ error: { message: 'Unauthorized. Please log in.' } }, { status: 401 });
    }

    // 2. Fetch API key from Appwrite Database (linked to user ID)
    const { databases } = await createAdminClient();
    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DB_ID || 'ascendancy_db';
    const collId = process.env.NEXT_PUBLIC_APPWRITE_SECRETS_COLLECTION_ID || 'user_secrets';

    const secrets = await databases.listDocuments(
      dbId,
      collId,
      [
        Query.equal('userId', user.$id),
        Query.equal('keyName', 'lightning_api_key'),
        Query.limit(1)
      ]
    );

    if (secrets.total === 0) {
      return NextResponse.json({ error: { message: 'Lightning API Key not found in your settings. Please configure it.' } }, { status: 400 });
    }

    const apiKey = secrets.documents[0].keyValue;

    // 3. Prepare and call Lightning AI
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    const body: any = {
      model: model,
      messages: [{ role: 'user', content: prompt }],
    };
    
    // Some models support reasoning
    if (includeReasoning) {
      // Logic for reasoning can be added here depending on model support
    }

    const response = await fetch('https://lightning.ai/api/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // Extract reasoning if available
    if (data.choices && data.choices[0].message) {
      const msg = data.choices[0].message;
      if (!msg.reasoning && msg.reasoning_content) {
        msg.reasoning = msg.reasoning_content;
      }
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: { message: error.message || 'Internal Server Error' } }, { status: 500 });
  }
}
