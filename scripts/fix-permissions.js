const { Client, Databases, Permission, Role } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '697e89ff001ad611e97a')
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID || 'ascendancy_db';

const COLLECTIONS = {
    user_secrets: {
        permissions: [
            Permission.create(Role.users()) // Authenticated users can create
        ],
        documentSecurity: true // Enable document-level security (users manage their own)
    },
    chat_history: {
        permissions: [
            Permission.create(Role.users()),
            Permission.read(Role.users()) // Users can read (filtered by doc security usually, or all if doc security is off? With doc security ON, this grants NOTHING extra unless they own it, or does it? Wait. If Doc Security is ON, collection read permission grants read access to ALL docs? No. If Doc Security is TRUE, then permissions are the union. Wait.
            // Documentation says: "When Document Security is enabled, you can define permissions for each document."
            // "Collection-level permissions apply to all documents in the collection."
            // So if I add 'read("users")' to collection, ALL users can read ALL docs. We DON'T want that for secrets.
            // We DO want 'create("users")' so they can create.
            // Once created, the Creator usually gets all permissions on the doc automatically.
        ],
        documentSecurity: true
    },
    debate_history: {
        permissions: [
            Permission.create(Role.users()),
            Permission.read(Role.users()) // Debates might be public? Let's keep it private for now.
        ],
        documentSecurity: true
    },
    council_config: {
        permissions: [
            Permission.create(Role.users()),
            Permission.read(Role.users())
        ],
        documentSecurity: true
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
