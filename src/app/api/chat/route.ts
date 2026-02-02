import { NextResponse } from 'next/server';
import { createSessionClient, createAdminClient } from '@/lib/appwrite-server';
import { Query, ID } from 'node-appwrite';

// --- SHARED TOOLS ---

async function searchWeb(query: string, provider: string = 'serper') {
  try {
    if (provider === 'tavily') {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) return 'Error: TAVILY_API_KEY not set on server.';
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, query: query, search_depth: "basic", max_results: 5 }),
      });
      if (!response.ok) return `Tavily Error ${response.status}`;
      const data = await response.json();
      return data.results?.map((item: any, i: number) => `[${i + 1}] ${item.title}\nLink: ${item.url}\nSnippet: ${item.content}`).join('\n\n') || 'No results found.';
    } else {
      const apiKey = process.env.SERPER_API_KEY;
      if (!apiKey) return 'Error: SERPER_API_KEY not set on server.';
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, num: 5 }),
      });
      if (!response.ok) return `Serper Error: ${response.status}`;
      const data = await response.json();
      return data.organic?.map((item: any, i: number) => `[${i + 1}] ${item.title}\nLink: ${item.link}\nSnippet: ${item.snippet}`).join('\n\n') || 'No results found.';
    }
  } catch (e: any) { return `Search Error: ${e.message}`; }
}

async function searchLibrary(query: string, userId: string) {
  try {
    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DB_ID || 'ascendancy_db';
    const { databases } = await createAdminClient();
    const results = await databases.listDocuments(dbId, 'library_chunks', [
      Query.search('content', query),
      ...(userId && userId !== 'guest' ? [Query.equal('userId', userId)] : []),
      Query.limit(5)
    ]);
    if (results.total === 0) return 'No matching information in library.';
    return results.documents.map((doc: any) => `Source: ${doc.fileName}\nContent: ${doc.content}`).join('\n\n---\n\n');
  } catch (e: any) { return `Library Error: ${e.message}`; }
}

const DEFAULT_COUNCIL = {
  moderator: 'lightning-ai/gpt-oss-120b', 
  skeptic: 'lightning-ai/llama-3.3-70b', 
  visionary: 'lightning-ai/DeepSeek-V3.1'
};

async function callAI(apiKey: string, model: string, messages: any[], provider: 'lightning' | 'openai') {
  let url = 'https://lightning.ai/api/v1/chat/completions';
  let fullModel = model || '';
  if (provider === 'openai') { url = 'https://api.openai.com/v1/chat/completions'; }
  else { fullModel = fullModel.startsWith('lightning-ai/') ? fullModel : `lightning-ai/${fullModel}`; }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: fullModel, messages, temperature: 0.7 }),
  });
  if (!response.ok) throw new Error(`${provider.toUpperCase()} Error: ${response.status}`);
  const data = await response.json();
  return data.choices[0].message.content;
}

export async function POST(req: Request) {
  try {
    const { prompt, model, messages: historyMessages, mode, debug, role, searchProvider = 'serper' } = await req.json();
    if (!prompt) return NextResponse.json({ error: { message: 'Prompt required' } }, { status: 400 });

    let user;
    try {
      const { account } = await createSessionClient();
      user = await account.get();
    } catch (e) {
      if (process.env.LIGHTNING_API_KEY || process.env.OPENAI_API_KEY) user = { $id: 'guest', name: 'Guest' };
      else return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
    }

    const { databases } = await createAdminClient();
    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DB_ID || 'ascendancy_db';
    let lightningKey = process.env.LIGHTNING_API_KEY, openaiKey = process.env.OPENAI_API_KEY, lUser = '', lTeam = '';

    if (user.$id !== 'guest') {
      try {
        const { databases: uDb } = await createSessionClient();
        const secrets = await uDb.listDocuments(dbId, 'user_secrets', [Query.equal('userId', user.$id)]);
        const findS = (n: string) => secrets.documents.find(d => d.keyName === n)?.keyValue;
        if (findS('lightning_api_key')) lightningKey = findS('lightning_api_key');
        if (findS('openai_api_key')) openaiKey = findS('openai_api_key');
        if (findS('lightning_username')) lUser = findS('lightning_username');
        if (findS('lightning_teamspace')) lTeam = findS('lightning_teamspace');
      } catch (e) {}
    }

    if (lightningKey && lUser && lTeam) lightningKey = `${lightningKey}/${lUser}/${lTeam}`;
    const getProviderAndKey = (m: string) => (m && (m.startsWith('gpt-') || m.startsWith('openai/'))) ? { provider: 'openai' as const, key: openaiKey } : { provider: 'lightning' as const, key: lightningKey };
    const safeCallAI = async (m: string, msgs: any[]) => {
      const { provider, key } = getProviderAndKey(m);
      if (!key) throw new Error(`Missing ${provider} key.`);
      return await callAI(key, m, msgs, provider);
    };

    const saveHistory = async (coll: string, data: any) => {
      if (user.$id === 'guest') return;
      try { await databases.createDocument(dbId, coll, ID.unique(), data); } catch (e) {}
    };

    // --- TOOL USE LOGIC ---
    const toolUse = async (currentModel: string, userPrompt: string, currentMessages: any[]) => {
      const analyzerPrompt = `Analyze the user prompt: "${userPrompt}". 
      Reply with "WEB" for current events/news, "LIBRARY" for personal files/notes, or "NONE".`;
      const decision = await safeCallAI(currentModel, [{ role: 'user', content: analyzerPrompt }]);
      
      if (decision.includes('WEB')) {
        const q = await safeCallAI(currentModel, [{ role: 'user', content: `Generate a search query for: "${userPrompt}". Reply with ONLY the query.` }]);
        const res = await searchWeb(q, searchProvider);
        return `\n\nWEB SEARCH RESULTS:\n${res}`;
      } else if (decision.includes('LIBRARY')) {
        const q = await safeCallAI(currentModel, [{ role: 'user', content: `Generate a library query for: "${userPrompt}". Reply with ONLY the query.` }]);
        const res = await searchLibrary(q, user.$id);
        return `\n\nLIBRARY CONTEXT:\n${res}`;
      }
      return "";
    };

    // SOLO MODE
    if (model && mode !== 'debate') {
      let msgs = historyMessages || [{ role: 'user', content: prompt }];
      if (!msgs.find((m: any) => m.role === 'system')) msgs.unshift({ role: 'system', content: role ? `You are ${role}.` : 'You are a helpful assistant.' });
      
      const knowledge = await toolUse(model, prompt, msgs);
      if (knowledge) msgs[msgs.length - 1].content += knowledge;

      const content = await safeCallAI(model, msgs);
      
      const { threadId: bodyThreadId } = await req.json().catch(() => ({}));

      await saveHistory('chat_history', { 
        userId: user.$id, 
        message: content, 
        role: 'assistant', 
        sender: model, 
        timestamp: new Date().toISOString(),
        threadId: bodyThreadId
      });
      return NextResponse.json({ content, model });
    }

    // DEBATE MODE
    let council = { ...DEFAULT_COUNCIL };
    try {
      const configs = await databases.listDocuments(dbId, 'council_config', [Query.equal('configId', 'default')]);
      if (configs.total > 0) {
        const c = configs.documents[0];
        council = { moderator: c.moderatorModel || council.moderator, skeptic: c.skepticModel || council.skeptic, visionary: c.visionaryModel || council.visionary };
      }
    } catch (e) {}

    // 1. Moderator (Fact Gathering)
    const knowledge = await toolUse(council.moderator, prompt, []);
    const modMessages = [
      { role: 'system', content: 'You are the Moderator. Provide a factual, balanced foundation for debate. Use the provided search results if available.' },
      { role: 'user', content: prompt + (knowledge ? `\n\nKNOWLEDGE BASE:\n${knowledge}` : '') }
    ];
    const modResponse = await safeCallAI(council.moderator, modMessages);

    // 2. Skeptic (The Challenger)
    const skepticMessages = [
      { role: 'system', content: 'You are the Skeptic. Your goal is to tear down the Moderator\'s answer. Find biases, missing data, or logical fallacies. Be sharp and critical.' },
      { role: 'user', content: `Topic: ${prompt}\n\nModerator's Position: ${modResponse}` }
    ];
    const skepticResponse = await safeCallAI(council.skeptic, skepticMessages);

    // 3. Visionary (The Final Synthesizer)
    const visionaryMessages = [
      { role: 'system', content: 'You are the Visionary. Review the debate between the Moderator and the Skeptic. Synthesize the core truth and provide a final, definitive answer for the user. Be authoritative and comprehensive.' },
      { role: 'user', content: `Topic: ${prompt}\n\nModerator: ${modResponse}\n\nSkeptic: ${skepticResponse}` }
    ];
    const visionaryResponse = await safeCallAI(council.visionary, visionaryMessages);

    await saveHistory('debate_history', {
      debateId: ID.unique(), topic: prompt,
      result: JSON.stringify({ moderator: { model: council.moderator, content: modResponse }, skeptic: { model: council.skeptic, content: skepticResponse }, visionary: { model: council.visionary, content: visionaryResponse } }),
      timestamp: new Date().toISOString(), userId: user.$id
    });

    return NextResponse.json({ content: visionaryResponse, debate: { moderator: modResponse, skeptic: skepticResponse, visionary: visionaryResponse }, models: council });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: { message: error.message || 'Internal Error' } }, { status: 500 });
  }
}
