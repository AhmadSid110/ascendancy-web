import { Client, Account, Databases, Storage, Query } from 'appwrite';

const client = new Client();
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '697e89ff001ad611e97a';
const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID || 'ascendancy_db';

client
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

// Collections IDs
const COLLECTIONS = {
    COUNCIL_CONFIG: 'council_config',
    DEBATE_HISTORY: 'debate_history',
    CHAT_HISTORY: 'chat_history',
    SECRETS: 'user_secrets'
};

// Initialize collections
async function initCollections() {
    try {
        // Create council_config collection if it doesn't exist
        await databases.createCollection(
            DB_ID,
            COLLECTIONS.COUNCIL_CONFIG,
            'Council Configurations',
            ['role:all'],
            ['role:all']
        ).catch(() => {}); // Ignore if already exists

        // Add attributes for council_config
        await databases.createStringAttribute(
            DB_ID,
            COLLECTIONS.COUNCIL_CONFIG,
            'configId',
            255,
            true
        ).catch(() => {});
        
        await databases.createStringAttribute(
            DB_ID,
            COLLECTIONS.COUNCIL_CONFIG,
            'moderatorModel',
            255,
            true
        ).catch(() => {});
        
        await databases.createStringAttribute(
            DB_ID,
            COLLECTIONS.COUNCIL_CONFIG,
            'skepticModel',
            255,
            true
        ).catch(() => {});
        
        await databases.createStringAttribute(
            DB_ID,
            COLLECTIONS.COUNCIL_CONFIG,
            'visionaryModel',
            255,
            true
        ).catch(() => {});

        // Create debate_history collection if it doesn't exist
        await databases.createCollection(
            DB_ID,
            COLLECTIONS.DEBATE_HISTORY,
            'Debate History',
            ['role:all'],
            ['role:all']
        ).catch(() => {}); // Ignore if already exists

        // Add attributes for debate_history
        await databases.createStringAttribute(
            DB_ID,
            COLLECTIONS.DEBATE_HISTORY,
            'debateId',
            255,
            true
        ).catch(() => {});
        
        await databases.createStringAttribute(
            DB_ID,
            COLLECTIONS.DEBATE_HISTORY,
            'topic',
            1000,
            true
        ).catch(() => {});
        
        await databases.createStringAttribute(
            DB_ID,
            COLLECTIONS.DEBATE_HISTORY,
            'result',
            5000,
            true
        ).catch(() => {});
        
        await databases.createDatetimeAttribute(
            DB_ID,
            COLLECTIONS.DEBATE_HISTORY,
            'timestamp',
            true
        ).catch(() => {});
        
        console.log('Appwrite collections initialized successfully');
    } catch (error) {
        console.error('Error initializing collections:', error);
    }
}

// Authentication functions
async function createAccount(email, password, name) {
    try {
        const user = await account.create('unique()', email, password, name);
        return user;
    } catch (error) {
        console.error('Error creating account:', error);
        throw error;
    }
}

async function login(email, password) {
    try {
        const session = await account.createEmailSession(email, password);
        return session;
    } catch (error) {
        console.error('Error logging in:', error);
        throw error;
    }
}

async function getCurrentUser() {
    try {
        const user = await account.get();
        return user;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

async function logout() {
    try {
        await account.deleteSession('current');
    } catch (error) {
        console.error('Error logging out:', error);
    }
}

// Council configuration functions
async function saveCouncilConfig(config) {
    try {
        const response = await databases.createDocument(
            DB_ID,
            COLLECTIONS.COUNCIL_CONFIG,
            'unique()',
            {
                configId: config.configId || 'default',
                moderatorModel: config.moderatorModel,
                skepticModel: config.skepticModel,
                visionaryModel: config.visionaryModel,
                createdAt: new Date().toISOString()
            }
        );
        return response;
    } catch (error) {
        console.error('Error saving council config:', error);
        throw error;
    }
}

async function getCouncilConfig(configId = 'default') {
    try {
        // Find the config document by configId
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.COUNCIL_CONFIG,
            [
                Query.equal('configId', configId)
            ]
        );
        
        if (response.documents.length > 0) {
            return response.documents[0];
        }
        return null;
    } catch (error) {
        console.error('Error getting council config:', error);
        return null;
    }
}

async function updateCouncilConfig(configId, updatedConfig) {
    try {
        // Find the document first
        const existingDocs = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.COUNCIL_CONFIG,
            [
                Query.equal('configId', configId)
            ]
        );
        
        if (existingDocs.documents.length === 0) {
            throw new Error('Configuration not found');
        }
        
        const docId = existingDocs.documents[0].$id;
        
        const response = await databases.updateDocument(
            DB_ID,
            COLLECTIONS.COUNCIL_CONFIG,
            docId,
            {
                moderatorModel: updatedConfig.moderatorModel,
                skepticModel: updatedConfig.skepticModel,
                visionaryModel: updatedConfig.visionaryModel,
                updatedAt: new Date().toISOString()
            }
        );
        return response;
    } catch (error) {
        console.error('Error updating council config:', error);
        throw error;
    }
}

// Debate history functions
async function saveDebateHistory(debate) {
    try {
        const response = await databases.createDocument(
            DB_ID,
            COLLECTIONS.DEBATE_HISTORY,
            'unique()',
            {
                debateId: debate.debateId || `debate_${Date.now()}`,
                topic: debate.topic,
                result: debate.result,
                timestamp: new Date().toISOString(),
                userId: debate.userId || null
            }
        );
        return response;
    } catch (error) {
        console.error('Error saving debate history:', error);
        throw error;
    }
}

async function getDebateHistory(limit = 20, offset = 0) {
    try {
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.DEBATE_HISTORY,
            [
                Query.orderDesc('$createdAt'),
                Query.limit(limit),
                Query.offset(offset)
            ]
        );
        return response;
    } catch (error) {
        console.error('Error getting debate history:', error);
        return { documents: [], total: 0 };
    }
}

// Export the initialized services
export {
    client,
    account,
    databases,
    storage,
    initCollections,
    createAccount,
    login,
    getCurrentUser,
    logout,
    saveCouncilConfig,
    getCouncilConfig,
    updateCouncilConfig,
    saveDebateHistory,
    getDebateHistory
};