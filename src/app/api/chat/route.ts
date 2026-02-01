import { NextResponse } from 'next/server';
import { createSessionClient, createAdminClient } from '@/lib/appwrite-server';
import { Query, ID } from 'node-appwrite';

// Updated to use Lightning AI specific model names
const DEFAULT_COUNCIL = {
  moderator: 'lightning-ai/gpt-oss-120b', // Aligned with user preference
  skeptic: 'lightning-ai/qwen2.5-72b-instruct', 
  visionary: 'lightning-ai/llama-3.3-70b-instruct'
};

async function callLightningAI(apiKey: string, model: string, messages: any[]) {
  // Ensure model has the correct prefix if missing
  const fullModel = model.startsWith('lightning-ai/') ? model : `lightning-ai/${model}`;
  
  const response = await fetch('https://lightning.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: fullModel,
      messages: messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Lightning AI Error (${fullModel}):`, text);
    throw new Error(`Lightning AI Error (${fullModel}): ${response.status} - ${text}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function POST(req: Request) {
  try {
    const { prompt, model, messages: historyMessages, mode } = await req.json();

    if (!prompt) {
        return NextResponse.json({ error: { message: 'Prompt is required' } }, { status: 400 });
    }

    // 1. Authenticate user
    let user;
    try {
      const { account } = await createSessionClient();
      user = await account.get();
    } catch (e) {
      return NextResponse.json({ error: { message: 'Unauthorized. Please log in.' } }, { status: 401 });
    }

    // 2. Setup Admin Client for DB operations
    const { databases } = await createAdminClient();
    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DB_ID || 'ascendancy_db';
    
    // 3. Fetch API Key
    const secretsColl = process.env.NEXT_PUBLIC_APPWRITE_SECRETS_COLLECTION_ID || 'user_secrets';
    const secrets = await databases.listDocuments(
      dbId,
      secretsColl,
      [
        Query.equal('userId', user.$id),
        Query.equal('keyName', 'lightning_api_key'),
        Query.limit(1)
      ]
    );

    if (secrets.total === 0) {
      return NextResponse.json({ error: { message: 'Lightning API Key not found. Please configure it in settings.' } }, { status: 400 });
    }
    const apiKey = secrets.documents[0].keyValue;

    // DIRECT / SOLO MODE
    if (model && mode !== 'debate') {
        const messages = historyMessages || [{ role: 'user', content: prompt }];
        // Ensure the last message is the current prompt if not already in history (simplified)
        // Ideally we just trust messages passed or construct [system, user]
        // But for simplicity in this edit:
        const requestMessages = [
            { role: 'system', content: 'You are a helpful AI assistant.' },
            { role: 'user', content: prompt }
        ];

        const content = await callLightningAI(apiKey, model, requestMessages);
        
        // Save to history
        await databases.createDocument(
            dbId,
            process.env.NEXT_PUBLIC_APPWRITE_CHAT_COLLECTION_ID || 'chat_history',
            ID.unique(),
            {
                userId: user.$id,
                message: content,
                role: 'assistant',
                sender: model,
                timestamp: new Date().toISOString()
            }
        );

        return NextResponse.json({
            content,
            model
        });
    }

    // --- DEBATE PROTOCOL (Default) ---

    // 4. Fetch Council Config
    let council = { ...DEFAULT_COUNCIL };
    try {
        const configColl = 'council_config';
        const configs = await databases.listDocuments(
            dbId,
            configColl,
            [Query.equal('configId', 'default'), Query.limit(1)] 
        );
        if (configs.total > 0) {
            const c = configs.documents[0];
            council = {
                moderator: c.moderatorModel || DEFAULT_COUNCIL.moderator,
                skeptic: c.skepticModel || DEFAULT_COUNCIL.skeptic,
                visionary: c.visionaryModel || DEFAULT_COUNCIL.visionary,
            };
        }
    } catch (e) {
        console.warn("Could not fetch council config, using defaults.");
    }

    // Step 1: The Moderator
    const modMessages = [
        { role: 'system', content: 'You are the Moderator of the Ascendancy Council. Provide a balanced, objective, and standard answer to the user query.' },
        { role: 'user', content: prompt }
    ];
    const modResponse = await callLightningAI(apiKey, council.moderator, modMessages);

    // Step 2: The Skeptic
    const skepticMessages = [
        { role: 'system', content: 'You are the Skeptic of the Ascendancy Council. Your job is to challenge the Moderator\'s answer. Find flaws, logical gaps, potential hallucinations, or missing perspectives. Be critical but constructive.' },
        { role: 'user', content: `User Query: "${prompt}"\n\nModerator Answer: "${modResponse}"` }
    ];
    const skepticResponse = await callLightningAI(apiKey, council.skeptic, skepticMessages);

    // Step 3: The Visionary
    const visionaryMessages = [
        { role: 'system', content: 'You are the Visionary of the Ascendancy Council. Synthesize a final, forward-looking, and comprehensive answer based on the debate. Incorporate the valid points from the Skeptic while maintaining the core truth from the Moderator. Your answer is the final output to the user.' },
        { role: 'user', content: `User Query: "${prompt}"\n\nModerator Answer: "${modResponse}"\n\nSkeptic Critique: "${skepticResponse}"` }
    ];
    const visionaryResponse = await callLightningAI(apiKey, council.visionary, visionaryMessages);

    // 5. Persistence
    const debateId = ID.unique();
    await databases.createDocument(
        dbId,
        'debate_history',
        debateId,
        {
            debateId: debateId,
            topic: prompt,
            result: JSON.stringify({
                moderator: { model: council.moderator, content: modResponse },
                skeptic: { model: council.skeptic, content: skepticResponse },
                visionary: { model: council.visionary, content: visionaryResponse }
            }),
            timestamp: new Date().toISOString(),
            userId: user.$id
        }
    );

    await databases.createDocument(
        dbId,
        process.env.NEXT_PUBLIC_APPWRITE_CHAT_COLLECTION_ID || 'chat_history',
        ID.unique(),
        {
            userId: user.$id,
            message: visionaryResponse,
            role: 'assistant',
            timestamp: new Date().toISOString()
        }
    );
    
    // Also save user message if needed (usually handled by frontend or before this)
    await databases.createDocument(
        dbId,
        process.env.NEXT_PUBLIC_APPWRITE_CHAT_COLLECTION_ID || 'chat_history',
        ID.unique(),
        {
            userId: user.$id,
            message: prompt,
            role: 'user',
            timestamp: new Date().toISOString()
        }
    );

    return NextResponse.json({
        content: visionaryResponse,
        debate: {
            moderator: modResponse,
            skeptic: skepticResponse,
            visionary: visionaryResponse
        },
        models: council
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: { message: error.message || 'Internal Server Error' } }, { status: 500 });
  }
}
