const { MongoClient } = require('mongodb');

/**
 * Database migration script for production deployment
 */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/exchange_platform';

async function runMigrations() {
    console.log('🚀 Starting database migrations...');
    
    const client = new MongoClient(MONGODB_URI, { 
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000
    });
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db();
        
        // Check if migrations have already been run
        const migrationLog = db.collection('migration_log');
        const lastMigration = await migrationLog.findOne(
            { version: '3.0.0' },
            { sort: { timestamp: -1 } }
        );
        
        if (lastMigration && lastMigration.status === 'completed') {
            console.log('✅ Migrations already completed for version 3.0.0');
            return;
        }
        
        console.log('🔧 Running schema migrations...');
        
        // Users collection
        console.log('📝 Creating users indexes...');
        const users = db.collection('users');
        await users.createIndex({ email: 1 }, { unique: true, background: true });
        await users.createIndex({ username: 1 }, { unique: true, background: true });
        await users.createIndex({ tenantId: 1 }, { background: true });
        await users.createIndex({ createdAt: 1 }, { background: true });
        
        // Transactions collection
        console.log('📝 Creating transactions indexes...');
        const transactions = db.collection('transactions');
        await transactions.createIndex({ userId: 1 }, { background: true });
        await transactions.createIndex({ type: 1 }, { background: true });
        await transactions.createIndex({ status: 1 }, { background: true });
        await transactions.createIndex({ createdAt: -1 }, { background: true });
        await transactions.createIndex({ tenantId: 1 }, { background: true });
        await transactions.createIndex({ userId: 1, status: 1, createdAt: -1 }, { background: true });
        
        // Exchange rates collection
        console.log('📝 Creating exchange rates indexes...');
        const exchangeRates = db.collection('exchange_rates');
        await exchangeRates.createIndex({ from: 1, to: 1 }, { background: true });
        await exchangeRates.createIndex({ timestamp: -1 }, { background: true });
        await exchangeRates.createIndex({ tenantId: 1 }, { background: true });
        
        // Accounts collection
        console.log('📝 Creating accounts indexes...');
        const accounts = db.collection('accounts');
        await accounts.createIndex({ userId: 1 }, { background: true });
        await accounts.createIndex({ currency: 1 }, { background: true });
        await accounts.createIndex({ tenantId: 1 }, { background: true });
        await accounts.createIndex({ accountNumber: 1 }, { unique: true, background: true });
        await accounts.createIndex({ userId: 1, currency: 1 }, { background: true });
        
        // Sessions collection (for express-session)
        console.log('📝 Creating sessions indexes...');
        const sessions = db.collection('sessions');
        await sessions.createIndex({ expires: 1 }, { expireAfterSeconds: 0, background: true });
        await sessions.createIndex({ userId: 1 }, { background: true });
        
        console.log('✅ Schema migrations completed');
        
        // Log successful migration
        await migrationLog.insertOne({
            version: '3.0.0',
            timestamp: new Date(),
            status: 'completed',
            type: 'schema_migration',
            environment: process.env.NODE_ENV || 'development'
        });
        
        console.log('✅ Database migrations completed successfully');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        
        // Log failed migration
        try {
            const db = client.db();
            const migrationLog = db.collection('migration_log');
            await migrationLog.insertOne({
                version: '3.0.0',
                timestamp: new Date(),
                status: 'failed',
                type: 'schema_migration',
                error: error.message,
                environment: process.env.NODE_ENV || 'development'
            });
        } catch (logError) {
            console.error('❌ Failed to log migration error:', logError);
        }
        
        process.exit(1);
    } finally {
        await client.close();
    }
}

// Run migrations if this script is executed directly
if (require.main === module) {
    runMigrations()
        .then(() => {
            console.log('🎉 Migration process completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration process failed:', error);
            process.exit(1);
        });
}

module.exports = { runMigrations };