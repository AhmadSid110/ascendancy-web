import { NextResponse } from 'next/server';
import { createSessionClient, createAdminClient } from '@/lib/appwrite-server';
import { Query, ID } from 'node-appwrite';

// --- SHARED TOOLS (Moved inline for reliability in Cloud environments) ---

async function searchWeb(query: string, provider: string = 'serper') {
  try {
    if (provider === 'tavily') {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) return 'Error: TAVILY_API_KEY not set on server.';
      
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

      if (!response.ok) return `Tavily Error: ${response.status}`;
      const data = await response.json();
      return data.results?.map((item: any, i: number) => (
        `[${i + 1}] ${item.title}\nLink: ${item.url}\nSnippet: ${item.content}`
      )).join('\n\n') || 'No results found.';
    } else {
      const apiKey = process.env.SERPER_API_KEY;
      if (!apiKey) return 'Error: SERPER_API_KEY not set on server.';

      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: query, num: 5 }),
      });

      if (!response.ok) return `Serper Error: ${response.status}`;
      const data = await response.json();
      return data.organic?.map((item: any, i: number) => (
        `[${i + 1}] ${item.title}\nLink: ${item.link}\nSnippet: ${item.snippet}`
      )).join('\n\n') || 'No results found.';
    }
  } catch (e: any) {
    return `Search Tool Error: ${e.message}`;
  }
}

async function searchLibrary(query: string, userId: string) {
  try {
    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DB_ID || 'ascendancy_db';
    const collId = 'library_chunks';
    const { databases } = await createAdminClient();

    const results = await databases.listDocuments(
      dbId,
      collId,
      [
        Query.search('content', query),
        ...(userId && userId !== 'guest' ? [Query.equal('userId', userId)] : []),
        Query.limit(5)
      ]
    );

    if (results.total === 0) return 'No matching information found in your library.';

    return results.documents.map((doc: any) => (
      `Source: ${doc.fileName}\nContent: ${doc.content}`
    )).join('\n\n---\n\n');
  } catch (e: any) {
    return `Library Tool Error: ${e.message}`;
  }
}

// Updated to use Lightning AI specific model names from verified list
const DEFAULT_COUNCIL = {
  moderator: 'lightning-ai/gpt-oss-120b', 
  skeptic: 'lightning-ai/llama-3.3-70b', 
  visionary: 'lightning-ai/DeepSeek-V3.1'
};

async function callAI(apiKey: string, model: string, messages: any[], provider: 'lightning' | 'openai') {
  let url = 'https://lightning.ai/api/v1/chat/completions';
  let fullModel = model || '';

  if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
  } else if (fullModel) {
    // Lightning
    fullModel = fullModel.startsWith('lightning-ai/') ? fullModel : `lightning-ai/${fullModel}`;
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
    const { prompt, model, messages: historyMessages, mode, debug, role, searchProvider = 'serper' } = await req.json();

    if (!prompt) {
        return NextResponse.json({ error: { message: 'Prompt is required' } }, { status: 400 });
    }

    // 1. Authenticate user or fallback to Guest if server keys exist
    let user;
    try {
      const { account } = await createSessionClient();
      user = await account.get();
    } catch (e: any) {
      console.warn("Session check failed:", e.message);
      if (process.env.LIGHTNING_API_KEY || process.env.OPENAI_API_KEY) {
          user = { $id: 'guest', name: 'Guest User' };
      } else {
          return NextResponse.json({ 
              error: { 
                  message: 'Unauthorized. Please log in.',
                  debug: e.message 
              } 
          }, { status: 401 });
      }
    }

    // 2. Setup Admin Client for DB operations
    const { databases } = await createAdminClient();
    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DB_ID || 'ascendancy_db';
    const secretsColl = process.env.NEXT_PUBLIC_APPWRITE_SECRETS_COLLECTION_ID || 'user_secrets';

    // 3. Fetch API Keys (User override -> Server fallback)
    let lightningKey = process.env.LIGHTNING_API_KEY;
    let openaiKey = process.env.OPENAI_API_KEY;
    let lightningUsername = '';
    let lightningTeamspace = '';

    if (user.$id !== 'guest') {
        try {
            const { databases: userDatabases } = await createSessionClient();
            const secrets = await userDatabases.listDocuments(
                dbId,
                secretsColl,
                [
                    Query.equal('userId', user.$id),
                    Query.limit(20)
                ]
            );

            const findSecret = (name: string) => secrets.documents.find(d => d.keyName === name)?.keyValue;

            if (findSecret('lightning_api_key')) lightningKey = findSecret('lightning_api_key');
            if (findSecret('openai_api_key')) openaiKey = findSecret('openai_api_key');
            if (findSecret('lightning_username')) lightningUsername = findSecret('lightning_username');
            if (findSecret('lightning_teamspace')) lightningTeamspace = findSecret('lightning_teamspace');

        } catch (e: any) {
            console.warn("Session client secrets fetch failed, trying admin client...", e.message);
            try {
                const secrets = await databases.listDocuments(
                    dbId,
                    secretsColl,
                    [
                        Query.equal('userId', user.$id),
                        Query.limit(20)
                    ]
                );
                const findSecret = (name: string) => secrets.documents.find(d => d.keyName === name)?.keyValue;
                if (findSecret('lightning_api_key')) lightningKey = findSecret('lightning_api_key');
                if (findSecret('openai_api_key')) openaiKey = findSecret('openai_api_key');
                if (findSecret('lightning_username')) lightningUsername = findSecret('lightning_username');
                if (findSecret('lightning_teamspace')) lightningTeamspace = findSecret('lightning_teamspace');
            } catch (adminErr: any) {}
        }
    }

    if (lightningKey && lightningUsername && lightningTeamspace) {
        lightningKey = `${lightningKey}/${lightningUsername}/${lightningTeamspace}`;
    }

    const getProviderAndKey = (modelName: string) => {
        if (modelName && (modelName.startsWith('gpt-') || modelName.startsWith('o1-') || modelName.startsWith('openai/'))) {
            return { provider: 'openai' as const, key: openaiKey };
        }
        return { provider: 'lightning' as const, key: lightningKey };
    };

    const safeCallAI = async (m: string, msgs: any[]) => {
        const { provider, key } = getProviderAndKey(m);
        if (!key) throw new Error(`Missing API Key for provider: ${provider}.`);
        return await callAI(key, m, msgs, provider);
    };

    const saveHistory = async (collectionId: string, data: any) => {
        if (user.$id === 'guest') return;
        try {
            await databases.createDocument(dbId, collectionId, ID.unique(), data);
        } catch (e) {
            console.error("Failed to save history:", e);
        }
    };

    // DIRECT / SOLO MODE
    if (model && mode !== 'debate') {
        let messages = historyMessages || [{ role: 'user', content: prompt }];
        if (!messages.find((m: any) => m.role === 'system')) {
            const systemContent = role ? `You are ${role}.` : 'You are a helpful AI assistant.';
            messages.unshift({ role: 'system', content: systemContent });
        }

        // --- TOOL USE DETECTION ---
        const needsSearchPrompt = `You are a query analyzer. Given the user prompt, decide if we need to search the WEB or the USER'S LIBRARY.
        Reply only with:
        - "WEB" if it's about current events, news, or public data.
        - "LIBRARY" if it sounds like they are asking about their own documents, personal notes, or uploaded files.
        - "NONE" if no search is needed.

        Prompt: "${prompt}"`;
        
        const decision = await safeCallAI(model, [{ role: 'user', content: needsSearchPrompt }]);
        
        let toolResults = "";
        if (decision.includes('WEB')) {
            console.log(`[Chat] Tool Use: Search (${searchProvider})`);
            const qPrompt = `Generate a short Google search query for: "${prompt}". Reply with only the query.`;
            const searchQuery = await safeCallAI(model, [{ role: 'user', content: qPrompt }]);
            const results = await searchWeb(searchQuery, searchProvider);
            toolResults = `\n\nWEB SEARCH RESULTS (${searchProvider.toUpperCase()}):\n${results}\n\nUse this to answer.`;
            messages[messages.length - 1].content += toolResults;
        } else if (decision.includes('LIBRARY')) {
            console.log(`[Chat] Tool Use: Library`);
            const qPrompt = `Generate a keyword search query for a personal library for: "${prompt}". Reply with only the query.`;
            const searchQuery = await safeCallAI(model, [{ role: 'user', content: qPrompt }]);
            const results = await searchLibrary(searchQuery, user.$id);
            toolResults = `\n\nLIBRARY KNOWLEDGE:\n${results}\n\nUse this personal context to answer.`;
            messages[messages.length - 1].content += toolResults;
        }

        const content = await safeCallAI(model, messages);
        
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

    // --- DEBATE PROTOCOL ---
    let council = { ...DEFAULT_COUNCIL };
    try {
        const configs = await databases.listDocuments(dbId, 'council_config', [Query.equal('configId', 'default'), Query.limit(1)]);
        if (configs.total > 0) {
            const c = configs.documents[0];
            council = {
                moderator: c.moderatorModel || DEFAULT_COUNCIL.moderator,
                skeptic: c.skepticModel || DEFAULT_COUNCIL.skeptic,
                visionary: c.visionaryModel || DEFAULT_COUNCIL.visionary,
            };
        }
    } catch (e) {}

    const modMessages = [{ role: 'system', content: 'Moderator: Provide a standard answer.' }, { role: 'user', content: prompt }];
    const modResponse = await safeCallAI(council.moderator, modMessages);

    const skepticMessages = [{ role: 'system', content: 'Skeptic: Critique the answer.' }, { role: 'user', content: `Query: "${prompt}"\n\nMod: "${modResponse}"` }];
    const skepticResponse = await safeCallAI(council.skeptic, skepticMessages);

    const visionaryMessages = [{ role: 'system', content: 'Visionary: Synthesize final answer.' }, { role: 'user', content: `Query: "${prompt}"\n\nMod: "${modResponse}"\n\nSkeptic: "${skepticResponse}"` }];
    const visionaryResponse = await safeCallAI(council.visionary, visionaryMessages);

    await saveHistory('debate_history', {
        debateId: ID.unique(),
        topic: prompt,
        result: JSON.stringify({
            moderator: { model: council.moderator, content: modResponse },
            skeptic: { model: council.skeptic, content: skepticResponse },
            visionary: { model: council.visionary, content: visionaryResponse }
        }),
        timestamp: new Date().toISOString(),
        userId: user.$id
    });

    await saveHistory(process.env.NEXT_PUBLIC_APPWRITE_CHAT_COLLECTION_ID || 'chat_history', {
        userId: user.$id,
        message: visionaryResponse,
        role: 'assistant',
        timestamp: new Date().toISOString()
    });

    return NextResponse.json({
        content: visionaryResponse,
        debate: { moderator: modResponse, skeptic: skepticResponse, visionary: visionaryResponse },
        models: council
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: { message: error.message || 'Internal Error' } }, { status: 500 });
  }
}
