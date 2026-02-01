const { Client, Databases, ID, Permission, Role } = require('node-appwrite');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '697e89ff001ad611e97a')
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

// Configuration
const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID || 'ascendancy_db';
const COLLECTIONS = {
    SECRETS: {
        id: process.env.NEXT_PUBLIC_APPWRITE_SECRETS_COLLECTION_ID || 'user_secrets',
        name: 'User Secrets',
        permissions: [
            Permission.read(Role.users()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users()),
        ],
        attributes: [
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'keyName', type: 'string', size: 100, required: true },
            { key: 'keyValue', type: 'string', size: 2048, required: true },
        ]
    },
    COUNCIL_CONFIG: {
        id: 'council_config',
        name: 'Council Configurations',
        permissions: [
            Permission.read(Role.any()),
        ],
        attributes: [
            { key: 'configId', type: 'string', size: 255, required: true },
            { key: 'moderatorModel', type: 'string', size: 255, required: true },
            { key: 'skepticModel', type: 'string', size: 255, required: true },
            { key: 'visionaryModel', type: 'string', size: 255, required: true },
        ]
    },
    DEBATE_HISTORY: {
        id: 'debate_history',
        name: 'Debate History',
        permissions: [
            Permission.read(Role.users()),
            Permission.create(Role.users()),
        ],
        attributes: [
            { key: 'debateId', type: 'string', size: 255, required: true },
            { key: 'topic', type: 'string', size: 1000, required: true },
            { key: 'result', type: 'string', size: 5000, required: true },
            { key: 'timestamp', type: 'datetime', required: true },
            { key: 'userId', type: 'string', size: 255, required: false },
        ]
    },
    CHAT_HISTORY: {
        id: process.env.NEXT_PUBLIC_APPWRITE_CHAT_COLLECTION_ID || 'chat_history',
        name: 'Chat History',
        permissions: [
            Permission.read(Role.users()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users()),
        ],
        attributes: [
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'message', type: 'string', size: 5000, required: true },
            { key: 'role', type: 'string', size: 50, required: true },
            { key: 'sender', type: 'string', size: 255, required: false },
            { key: 'timestamp', type: 'datetime', required: true },
        ]
    }
};

async function setup() {
    if (!process.env.APPWRITE_API_KEY) {
        console.error("Error: APPWRITE_API_KEY is missing in .env.local");
        console.log("Please provide your Appwrite API Key to run this script.");
        return;
    }

    try {
        console.log(`Checking database: ${DB_ID}...`);
        try {
            await databases.get(DB_ID);
            console.log("Database exists.");
        } catch (e) {
            console.log("Database not found, creating...");
            await databases.create(DB_ID, 'Ascendancy Database');
            console.log("Database created.");
        }

        for (const [key, config] of Object.entries(COLLECTIONS)) {
            console.log(`\nProcessing collection: ${config.name} (${config.id})...`);
            let collection;
            try {
                collection = await databases.getCollection(DB_ID, config.id);
                console.log("Collection exists.");
                
                // Update permissions
                console.log("Updating collection permissions...");
                await databases.updateCollection(DB_ID, config.id, config.name, config.permissions);

                // Check for missing attributes
                const existingKeys = collection.attributes.map(a => a.key);
                for (const attr of config.attributes) {
                    if (!existingKeys.includes(attr.key)) {
                        console.log(`Adding missing attribute: ${attr.key}...`);
                        try {
                            if (attr.type === 'string') {
                                await databases.createStringAttribute(DB_ID, config.id, attr.key, attr.size, attr.required);
                            } else if (attr.type === 'datetime') {
                                await databases.createDatetimeAttribute(DB_ID, config.id, attr.key, attr.required);
                            }
                            console.log(` - Added ${attr.key}`);
                            await new Promise(r => setTimeout(r, 500)); 
                        } catch (err) {
                            console.log(` - Error adding ${attr.key}: ${err.message}`);
                        }
                    }
                }
            } catch (e) {
                console.log("Collection not found, creating...");
                await databases.createCollection(DB_ID, config.id, config.name, config.permissions);
                console.log("Collection created.");
                
                // Add attributes
                console.log("Adding attributes...");
                for (const attr of config.attributes) {
                    try {
                        if (attr.type === 'string') {
                            await databases.createStringAttribute(DB_ID, config.id, attr.key, attr.size, attr.required);
                        } else if (attr.type === 'datetime') {
                            await databases.createDatetimeAttribute(DB_ID, config.id, attr.key, attr.required);
                        }
                        console.log(` - Added ${attr.key}`);
                        await new Promise(r => setTimeout(r, 500)); 
                    } catch (err) {
                        console.log(` - Error adding ${attr.key}: ${err.message}`);
                    }
                }
            }

            // Ensure indexes for queries
            console.log("Ensuring indexes...");
            if (config.id === COLLECTIONS.SECRETS.id) {
                try { await databases.createIndex(DB_ID, config.id, 'userId_idx', 'key', ['userId'], ['asc']); } catch (e) {}
                try { await databases.createIndex(DB_ID, config.id, 'keyName_idx', 'key', ['keyName'], ['asc']); } catch (e) {}
            } else if (config.id === COLLECTIONS.CHAT_HISTORY.id) {
                try { await databases.createIndex(DB_ID, config.id, 'userId_idx', 'key', ['userId'], ['asc']); } catch (e) {}
            }
        }

        console.log("\nAppwrite setup complete!");
    } catch (error) {
        console.error("Setup failed:", error);
    }
}

setup().catch(console.error);
