import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

export async function POST(req: Request) {
  try {
    const { query, userId } = await req.json();
    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DB_ID || 'ascendancy_db';
    const collId = 'library_chunks';

    if (!query) return NextResponse.json({ error: 'Query is required' }, { status: 400 });

    const { databases } = await createAdminClient();

    console.log(`[Tool:Library] Searching for: ${query}`);

    // Perform full-text search across user's documents
    const results = await databases.listDocuments(
      dbId,
      collId,
      [
        Query.search('content', query),
        // userId filter removed if guest, or added if present
        ...(userId && userId !== 'guest' ? [Query.equal('userId', userId)] : []),
        Query.limit(5)
      ]
    );

    if (results.total === 0) {
      return NextResponse.json({ results: 'No matching information found in your library.' });
    }

    const context = results.documents.map((doc: any, i: number) => (
      `Source: ${doc.fileName}\nContent: ${doc.content}`
    )).join('\n\n---\n\n');

    return NextResponse.json({ results: context });

  } catch (error: any) {
    console.error('[Tool:Library] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
