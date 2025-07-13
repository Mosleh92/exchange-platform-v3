const { MongoClient } = require('mongodb');

/**
 * Database optimization script for Fly.io MongoDB deployment
 * This script optimizes connection pooling, queries, and performance
 */

class DatabaseOptimizer {
    constructor(uri) {
        this.uri = uri || process.env.MONGODB_URI;
        this.client = null;
        this.db = null;
    }

    async connect() {
        console.log('🔌 Connecting to MongoDB...');
        
        // Optimized connection options for Fly.io
        const options = {
            useUnifiedTopology: true,
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            bufferMaxEntries: 0, // Disable mongoose buffering
            bufferCommands: false, // Disable mongoose buffering
            retryWrites: true,
            retryReads: true,
            readPreference: 'primary',
            writeConcern: {
                w: 'majority',
                j: true,
                wtimeout: 10000
            },
            readConcern: {
                level: 'majority'
            },
            compressors: ['zlib'], // Enable compression
            zlibCompressionLevel: 6
        };

        this.client = new MongoClient(this.uri, options);
        await this.client.connect();
        this.db = this.client.db();
        console.log('✅ Connected to MongoDB with optimization settings');
    }

    async optimizeIndexes() {
        console.log('🚀 Optimizing database indexes...');

        try {
            // Users collection optimization
            const users = this.db.collection('users');
            await users.createIndex({ email: 1 }, { 
                unique: true, 
                background: true,
                partialFilterExpression: { email: { $exists: true } }
            });
            await users.createIndex({ username: 1 }, { 
                unique: true, 
                background: true,
                partialFilterExpression: { username: { $exists: true } }
            });
            await users.createIndex({ tenantId: 1, role: 1 }, { background: true });
            await users.createIndex({ createdAt: -1 }, { background: true });
            await users.createIndex({ lastLoginAt: -1 }, { 
                background: true,
                partialFilterExpression: { lastLoginAt: { $exists: true } }
            });

            // Transactions collection optimization
            const transactions = this.db.collection('transactions');
            await transactions.createIndex({ userId: 1, createdAt: -1 }, { background: true });
            await transactions.createIndex({ status: 1, createdAt: -1 }, { background: true });
            await transactions.createIndex({ type: 1, tenantId: 1 }, { background: true });
            await transactions.createIndex({ 
                'from.currency': 1, 
                'to.currency': 1, 
                createdAt: -1 
            }, { background: true });
            await transactions.createIndex({ 
                tenantId: 1, 
                userId: 1, 
                status: 1 
            }, { background: true });

            // Exchange rates optimization
            const exchangeRates = this.db.collection('exchange_rates');
            await exchangeRates.createIndex({ 
                from: 1, 
                to: 1, 
                timestamp: -1 
            }, { background: true });
            await exchangeRates.createIndex({ 
                tenantId: 1, 
                timestamp: -1 
            }, { background: true });
            
            // TTL index for old exchange rates (keep only 30 days)
            await exchangeRates.createIndex({ 
                timestamp: 1 
            }, { 
                background: true,
                expireAfterSeconds: 30 * 24 * 60 * 60 // 30 days
            });

            // Accounts collection optimization
            const accounts = this.db.collection('accounts');
            await accounts.createIndex({ 
                userId: 1, 
                currency: 1 
            }, { 
                unique: true, 
                background: true 
            });
            await accounts.createIndex({ 
                tenantId: 1, 
                currency: 1 
            }, { background: true });
            await accounts.createIndex({ 
                accountNumber: 1 
            }, { 
                unique: true, 
                background: true 
            });

            // Sessions collection optimization
            const sessions = this.db.collection('sessions');
            await sessions.createIndex({ 
                expires: 1 
            }, { 
                expireAfterSeconds: 0, 
                background: true 
            });
            await sessions.createIndex({ userId: 1 }, { 
                background: true,
                partialFilterExpression: { userId: { $exists: true } }
            });

            // Audit logs optimization
            const auditLogs = this.db.collection('audit_logs');
            await auditLogs.createIndex({ 
                userId: 1, 
                timestamp: -1 
            }, { background: true });
            await auditLogs.createIndex({ 
                action: 1, 
                timestamp: -1 
            }, { background: true });
            
            // TTL index for audit logs (keep only 90 days)
            await auditLogs.createIndex({ 
                timestamp: 1 
            }, { 
                background: true,
                expireAfterSeconds: 90 * 24 * 60 * 60 // 90 days
            });

            console.log('✅ Database indexes optimized');
        } catch (error) {
            console.error('❌ Index optimization failed:', error);
            throw error;
        }
    }

    async optimizeConnectionPool() {
        console.log('🔧 Setting up connection pool optimization...');

        // Monitor connection pool
        this.client.on('connectionPoolCreated', () => {
            console.log('🏊 Connection pool created');
        });

        this.client.on('connectionCreated', () => {
            console.log('🔗 New connection created');
        });

        this.client.on('connectionClosed', () => {
            console.log('🔌 Connection closed');
        });

        this.client.on('commandStarted', (event) => {
            if (process.env.LOG_LEVEL === 'debug') {
                console.log(`📤 Command started: ${event.commandName}`);
            }
        });

        this.client.on('commandSucceeded', (event) => {
            if (process.env.LOG_LEVEL === 'debug') {
                console.log(`✅ Command succeeded: ${event.commandName} (${event.duration}ms)`);
            }
        });

        this.client.on('commandFailed', (event) => {
            console.error(`❌ Command failed: ${event.commandName} - ${event.failure}`);
        });

        console.log('✅ Connection pool monitoring enabled');
    }

    async createAggregationOptimizations() {
        console.log('📊 Creating aggregation optimizations...');

        try {
            // Create materialized view for transaction statistics
            const transactions = this.db.collection('transactions');
            
            // Daily transaction stats
            await this.db.createCollection('daily_transaction_stats', {
                viewOn: 'transactions',
                pipeline: [
                    {
                        $match: {
                            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                        }
                    },
                    {
                        $group: {
                            _id: {
                                date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                                tenantId: '$tenantId',
                                type: '$type'
                            },
                            count: { $sum: 1 },
                            totalAmount: { $sum: '$amount' },
                            avgAmount: { $avg: '$amount' }
                        }
                    }
                ]
            });

            // User activity stats
            await this.db.createCollection('user_activity_stats', {
                viewOn: 'users',
                pipeline: [
                    {
                        $lookup: {
                            from: 'transactions',
                            localField: '_id',
                            foreignField: 'userId',
                            as: 'transactions'
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            email: 1,
                            tenantId: 1,
                            createdAt: 1,
                            lastLoginAt: 1,
                            transactionCount: { $size: '$transactions' },
                            totalTransactionValue: { $sum: '$transactions.amount' }
                        }
                    }
                ]
            });

            console.log('✅ Aggregation optimizations created');
        } catch (error) {
            console.error('❌ Aggregation optimization failed:', error);
            // Views might already exist, which is okay
        }
    }

    async analyzeQueryPerformance() {
        console.log('🔍 Analyzing query performance...');

        try {
            // Enable profiling for slow operations (>100ms)
            await this.db.runCommand({ 
                profile: 2, 
                slowms: 100,
                sampleRate: 0.1 // Sample 10% of operations
            });

            // Get current profiling status
            const profilingStatus = await this.db.runCommand({ profile: -1 });
            console.log('📊 Profiling status:', profilingStatus);

            // Analyze existing slow queries
            const slowQueries = await this.db.collection('system.profile')
                .find({ ts: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
                .sort({ ts: -1 })
                .limit(10)
                .toArray();

            if (slowQueries.length > 0) {
                console.log('🐌 Recent slow queries:');
                slowQueries.forEach(query => {
                    console.log(`- ${query.ns}: ${query.millis}ms - ${JSON.stringify(query.command)}`);
                });
            } else {
                console.log('✅ No slow queries found in the last 24 hours');
            }

        } catch (error) {
            console.error('❌ Query performance analysis failed:', error);
        }
    }

    async setupMonitoring() {
        console.log('📈 Setting up database monitoring...');

        try {
            // Create monitoring collection
            const monitoring = this.db.collection('db_monitoring');
            
            // Log current database stats
            const stats = await this.db.stats();
            await monitoring.insertOne({
                timestamp: new Date(),
                type: 'db_stats',
                stats: {
                    collections: stats.collections,
                    objects: stats.objects,
                    dataSize: stats.dataSize,
                    storageSize: stats.storageSize,
                    indexes: stats.indexes,
                    indexSize: stats.indexSize
                },
                environment: process.env.NODE_ENV || 'development',
                flyRegion: process.env.FLY_REGION || 'unknown'
            });

            // Create TTL index for monitoring data (keep only 7 days)
            await monitoring.createIndex({ 
                timestamp: 1 
            }, { 
                expireAfterSeconds: 7 * 24 * 60 * 60, // 7 days
                background: true 
            });

            console.log('✅ Database monitoring setup completed');
        } catch (error) {
            console.error('❌ Monitoring setup failed:', error);
        }
    }

    async optimizeMemoryUsage() {
        console.log('🧠 Optimizing memory usage...');

        try {
            // Compact collections to reclaim space
            const collections = await this.db.listCollections().toArray();
            
            for (const collection of collections) {
                if (!collection.name.startsWith('system.')) {
                    try {
                        await this.db.runCommand({ compact: collection.name });
                        console.log(`✅ Compacted collection: ${collection.name}`);
                    } catch (error) {
                        console.warn(`⚠️ Could not compact ${collection.name}:`, error.message);
                    }
                }
            }

            // Update collection statistics
            for (const collection of collections) {
                if (!collection.name.startsWith('system.')) {
                    try {
                        await this.db.runCommand({ reIndex: collection.name });
                        console.log(`✅ Reindexed collection: ${collection.name}`);
                    } catch (error) {
                        console.warn(`⚠️ Could not reindex ${collection.name}:`, error.message);
                    }
                }
            }

            console.log('✅ Memory optimization completed');
        } catch (error) {
            console.error('❌ Memory optimization failed:', error);
        }
    }

    async runOptimization() {
        try {
            await this.connect();
            await this.optimizeConnectionPool();
            await this.optimizeIndexes();
            await this.createAggregationOptimizations();
            await this.analyzeQueryPerformance();
            await this.setupMonitoring();
            await this.optimizeMemoryUsage();
            
            console.log('🎉 Database optimization completed successfully!');
        } catch (error) {
            console.error('❌ Database optimization failed:', error);
            throw error;
        } finally {
            if (this.client) {
                await this.client.close();
            }
        }
    }
}

// Run optimization if this script is executed directly
if (require.main === module) {
    const optimizer = new DatabaseOptimizer();
    optimizer.runOptimization()
        .then(() => {
            console.log('✅ Optimization process completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Optimization process failed:', error);
            process.exit(1);
        });
}

module.exports = DatabaseOptimizer;