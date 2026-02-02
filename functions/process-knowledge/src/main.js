const sdk = require('node-appwrite');
const pdf = require('pdf-parse');

module.exports = async function (context) {
    const { req, res, log, error } = context;

    // 1. Setup Appwrite Client
    const client = new sdk.Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

    const storage = new sdk.Storage(client);
    const databases = new sdk.Databases(client);
    
    const dbId = process.env.DB_ID || 'ascendancy_db';
    const collId = 'library_chunks';
    const bucketId = 'knowledge';

    // 2. Validate Event
    const fileId = req.body.$id || req.body.fileId;
    const fileName = req.body.name || 'unknown_file';
    
    if (!fileId) {
        return res.json({ success: false, error: 'No fileId provided' });
    }

    log(`Processing file: ${fileName} (${fileId})`);

    try {
        // 3. Download File from Storage
        const fileBuffer = await storage.getFileDownload(bucketId, fileId);
        let text = '';

        // 4. Extract Text based on Type
        if (fileName.toLowerCase().endsWith('.pdf')) {
            const data = await pdf(fileBuffer);
            text = data.text;
            log('Extracted text from PDF');
        } else {
            // Assume text-based (txt, md)
            text = fileBuffer.toString('utf-8');
            log('Extracted text from text file');
        }

        if (!text || text.trim().length === 0) {
            throw new Error('No text content found in file');
        }

        // 5. Chunking (Simple 2000 char chunks)
        const chunks = text.match(/[\s\S]{1,2000}/g) || [text];
        log(`Created ${chunks.length} chunks`);

        // 6. Save to Database
        for (const [index, chunk] of chunks.entries()) {
            await databases.createDocument(dbId, collId, sdk.ID.unique(), {
                userId: req.body.userId || 'system',
                fileId: fileId,
                fileName: fileName,
                content: chunk,
                metadata: JSON.stringify({ 
                    chunk: index + 1, 
                    total_chunks: chunks.length,
                    processedAt: new Date().toISOString() 
                })
            });
        }

        log('Successfully saved chunks to database');
        return res.json({ success: true, chunks: chunks.length });

    } catch (err) {
        error(`Processing failed: ${err.message}`);
        return res.json({ success: false, error: err.message });
    }
};
