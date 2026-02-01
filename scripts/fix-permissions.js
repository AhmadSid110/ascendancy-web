const { Client, Databases, Permission, Role } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '697e89ff001ad611e97a')
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID || 'ascendancy_db';

const COLLECTIONS = {
    user_secrets: {
        permissions: [
            Permission.create(Role.users())
        ],
        documentSecurity: true
    },
    chat_history: {
        permissions: [
            Permission.create(Role.users())
        ],
        documentSecurity: true
    },
    debate_history: {
        permissions: [
            Permission.create(Role.users())
        ],
        documentSecurity: true
    },
    council_config: {
        permissions: [
            Permission.read(Role.users()) // Everyone can read the config
        ],
        documentSecurity: false // Global config
    }
};

async function fixPermissions() {
    if (!process.env.APPWRITE_API_KEY) {
        console.error("Error: APPWRITE_API_KEY is missing in .env.local");
        return;
    }

    console.log(`Updating permissions for database: ${DB_ID}...`);

    for (const [colId, config] of Object.entries(COLLECTIONS)) {
        console.log(`Processing ${colId}...`);
        try {
            // Get current collection to get name (required for update)
            const col = await databases.getCollection(DB_ID, colId);
            
            // Update permissions
            // Note: updateCollection signature depends on version. 
            // Recent: (databaseId, collectionId, name, permissions, documentSecurity, enabled)
            await databases.updateCollection(
                DB_ID, 
                colId, 
                col.name, 
                config.permissions, 
                config.documentSecurity
            );
            console.log(` - Updated permissions for ${colId}`);
        } catch (e) {
            console.error(` - Failed to update ${colId}: ${e.message}`);
        }
    }
    console.log("Permission update complete.");
}

fixPermissions().catch(console.error);
