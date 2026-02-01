import { NextResponse } from 'next/server';
import { createSessionClient, createAdminClient } from '@/lib/appwrite-server';
import { Query, ID } from 'node-appwrite';

const DEFAULT_COUNCIL = {
  moderator: 'llama-3.1-70b-instruct',
  skeptic: 'qwen2.5-72b-instruct', // Using Qwen as a strong skeptic/logic model
  visionary: 'llama-3.3-70b-instruct'
};

async function callLightningAI(apiKey: string, model: string, messages: any[]) {
  const response = await fetch('https://lightning.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Lightning AI Error (${model}): ${response.status} - ${text}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

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

    // 4. Fetch Council Config
    let council = { ...DEFAULT_COUNCIL };
    try {
        const configColl = 'council_config';
        const configs = await databases.listDocuments(
            dbId,
            configColl,
            [Query.equal('configId', 'default'), Query.limit(1)] // Assuming 'default' or user-specific config
        );
        // Note: Ideally, we should check for a user-specific config, or a global default.
        // For now, if no config is found, we use defaults.
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

    // --- DEBATE PROTOCOL ---

    // Step 1: The Moderator
    // Role: Provide a balanced, standard answer.
    const modMessages = [
        { role: 'system', content: 'You are the Moderator of the Ascendancy Council. Provide a balanced, objective, and standard answer to the user query.' },
        { role: 'user', content: prompt }
    ];
    const modResponse = await callLightningAI(apiKey, council.moderator, modMessages);

    // Step 2: The Skeptic
    // Role: Challenge the answer. Find flaws.
    const skepticMessages = [
        { role: 'system', content: 'You are the Skeptic of the Ascendancy Council. Your job is to challenge the Moderator\'s answer. Find flaws, logical gaps, potential hallucinations, or missing perspectives. Be critical but constructive.' },
        { role: 'user', content: `User Query: "${prompt}"\n\nModerator Answer: "${modResponse}"` }
    ];
    const skepticResponse = await callLightningAI(apiKey, council.skeptic, skepticMessages);

    // Step 3: The Visionary
    // Role: Synthesize final resolution.
    const visionaryMessages = [
        { role: 'system', content: 'You are the Visionary of the Ascendancy Council. Synthesize a final, forward-looking, and comprehensive answer based on the debate. Incorporate the valid points from the Skeptic while maintaining the core truth from the Moderator. Your answer is the final output to the user.' },
        { role: 'user', content: `User Query: "${prompt}"\n\nModerator Answer: "${modResponse}"\n\nSkeptic Critique: "${skepticResponse}"` }
    ];
    const visionaryResponse = await callLightningAI(apiKey, council.visionary, visionaryMessages);

    // 5. Persistence

    // Save Debate History
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

    // Save Chat History (The final result)
    await databases.createDocument(
        dbId,
        process.env.NEXT_PUBLIC_APPWRITE_CHAT_COLLECTION_ID || 'chat_history',
        ID.unique(),
        {
            userId: user.$id,
            message: visionaryResponse,
            role: 'assistant', // The 'Visionary' speaks for the system
            timestamp: new Date().toISOString()
        }
    );
    
    // Also save the USER's message to chat history if not already handled by frontend calling a separate endpoint.
    // Usually, chat apps save the user message *before* calling the API, or the API saves both. 
    // Assuming the API saves the assistant response, and we might want to ensure the user message is logged too.
    // But typically the frontend might do that. Let's just save the assistant response here to avoid duplicates if frontend handles user msg.
    // However, to be safe:
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

    // Return the result
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
