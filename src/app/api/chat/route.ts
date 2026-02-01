import { NextResponse } from 'next/server';
import { createSessionClient, createAdminClient } from '@/lib/appwrite-server';
import { Query, ID } from 'node-appwrite';

// Updated to use Lightning AI specific model names
const DEFAULT_COUNCIL = {
  moderator: 'lightning-ai/gpt-oss-120b', 
  skeptic: 'lightning-ai/qwen2.5-72b-instruct', 
  visionary: 'lightning-ai/llama-3.3-70b-instruct'
};

async function callAI(apiKey: string, model: string, messages: any[], provider: 'lightning' | 'openai') {
  let url = 'https://lightning.ai/api/v1/chat/completions';
  let fullModel = model;

  if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    // OpenAI models don't need a prefix usually, but we keep it if user entered it
    // If user entered "openai/gpt-4", strip "openai/" if needed, but usually just "gpt-4"
  } else {
    // Lightning
    fullModel = model.startsWith('lightning-ai/') ? model : `lightning-ai/${model}`;
  }
  
  const response = await fetch(url, {
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
    console.error(`${provider.toUpperCase()} AI Error (${fullModel}):`, text);
    throw new Error(`${provider.toUpperCase()} AI Error (${fullModel}): ${response.status} - ${text}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function POST(req: Request) {
  try {
    const { prompt, model, messages: historyMessages, mode, debug } = await req.json();

    if (!prompt) {
        return NextResponse.json({ error: { message: 'Prompt is required' } }, { status: 400 });
    }

    // 1. Authenticate user or fallback to Guest if server keys exist
    let user;
    try {
      const { account } = await createSessionClient();
      user = await account.get();
    } catch (e) {
      // Check if we can allow guest access via server-side keys
      if (process.env.LIGHTNING_API_KEY || process.env.OPENAI_API_KEY) {
          user = { $id: 'guest', name: 'Guest User' };
      } else {
          return NextResponse.json({ error: { message: 'Unauthorized. Please log in.' } }, { status: 401 });
      }
    }

    // 2. Setup Admin Client for DB operations
    const { databases } = await createAdminClient();
    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DB_ID || 'ascendancy_db';
    const secretsColl = process.env.NEXT_PUBLIC_APPWRITE_SECRETS_COLLECTION_ID || 'user_secrets';

    // 3. Fetch API Keys (User override -> Server fallback)
    let lightningKey = process.env.LIGHTNING_API_KEY;
    let openaiKey = process.env.OPENAI_API_KEY;

    if (user.$id !== 'guest') {
        try {
            const secrets = await databases.listDocuments(
            dbId,
            secretsColl,
            [
                Query.equal('userId', user.$id),
                Query.limit(10)
            ]
            );

            const lightningKeyDoc = secrets.documents.find(d => d.keyName === 'lightning_api_key');
            const openaiKeyDoc = secrets.documents.find(d => d.keyName === 'openai_api_key');

            if (lightningKeyDoc?.keyValue) lightningKey = lightningKeyDoc.keyValue;
            if (openaiKeyDoc?.keyValue) openaiKey = openaiKeyDoc.keyValue;
        } catch (e) {
            console.warn("Failed to fetch user secrets, falling back to system keys", e);
        }
    }

    const getProviderAndKey = (modelName: string) => {
        if (modelName.startsWith('gpt-') || modelName.startsWith('o1-') || modelName.startsWith('openai/')) {
            return { provider: 'openai' as const, key: openaiKey };
        }
        return { provider: 'lightning' as const, key: lightningKey };
    };

    // Helper wrapper to handle key missing errors
    const safeCallAI = async (m: string, msgs: any[]) => {
        const { provider, key } = getProviderAndKey(m);
        if (!key) throw new Error(`Missing API Key for provider: ${provider}`);
        return await callAI(key, m, msgs, provider);
    };

    // Helper for history persistence
    const saveHistory = async (collectionId: string, data: any) => {
        if (user.$id === 'guest') return; // Skip saving history for guests
        try {
            await databases.createDocument(dbId, collectionId, ID.unique(), data);
        } catch (e) {
            console.error("Failed to save history:", e);
        }
    };

    // DIRECT / SOLO MODE
    if (model && mode !== 'debate') {
        const messages = historyMessages || [{ role: 'user', content: prompt }];
        // Ensure system message if needed
        if (!messages.find((m: any) => m.role === 'system')) {
            messages.unshift({ role: 'system', content: 'You are a helpful AI assistant.' });
        }

        const content = await safeCallAI(model, messages);
        
        // Save to history
        await saveHistory(
            process.env.NEXT_PUBLIC_APPWRITE_CHAT_COLLECTION_ID || 'chat_history',
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
            model,
            debug: debug ? { provider: getProviderAndKey(model).provider } : undefined
        });
    }

    // --- DEBATE PROTOCOL (Default) ---
    // Use Lightning for debate by default unless moderator is OpenAI
    // For simplicity, we assume the Council is running on the default config or mostly Lightning
    // If moderator is GPT-4, we use OpenAI key for that step.

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
    const modResponse = await safeCallAI(council.moderator, modMessages);

    // Step 2: The Skeptic
    const skepticMessages = [
        { role: 'system', content: 'You are the Skeptic of the Ascendancy Council. Your job is to challenge the Moderator\'s answer. Find flaws, logical gaps, potential hallucinations, or missing perspectives. Be critical but constructive.' },
        { role: 'user', content: `User Query: "${prompt}"\n\nModerator Answer: "${modResponse}"` }
    ];
    const skepticResponse = await safeCallAI(council.skeptic, skepticMessages);

    // Step 3: The Visionary
    const visionaryMessages = [
        { role: 'system', content: 'You are the Visionary of the Ascendancy Council. Synthesize a final, forward-looking, and comprehensive answer based on the debate. Incorporate the valid points from the Skeptic while maintaining the core truth from the Moderator. Your answer is the final output to the user.' },
        { role: 'user', content: `User Query: "${prompt}"\n\nModerator Answer: "${modResponse}"\n\nSkeptic Critique: "${skepticResponse}"` }
    ];
    const visionaryResponse = await safeCallAI(council.visionary, visionaryMessages);

    // 5. Persistence
    await saveHistory(
        'debate_history',
        {
            debateId: ID.unique(),
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

    await saveHistory(
        process.env.NEXT_PUBLIC_APPWRITE_CHAT_COLLECTION_ID || 'chat_history',
        {
            userId: user.$id,
            message: visionaryResponse,
            role: 'assistant',
            timestamp: new Date().toISOString()
        }
    );
    
    // Also save user message if needed (usually handled by frontend or before this)
    await saveHistory(
        process.env.NEXT_PUBLIC_APPWRITE_CHAT_COLLECTION_ID || 'chat_history',
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
    return NextResponse.json({ error: { message: error.message || 'Internal Server Error', stack: process.env.NODE_ENV === 'development' ? error.stack : undefined } }, { status: 500 });
  }
}
