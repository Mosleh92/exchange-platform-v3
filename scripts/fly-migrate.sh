#!/bin/bash

# ==============================================
# Database Migration Script for Fly.io MongoDB
# ==============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MONGODB_URI="${MONGODB_URI:-mongodb://exchange-platform-db.internal:27017/exchange_platform}"
BACKUP_DIR="/tmp/db-backup-$(date +%Y%m%d-%H%M%S)"
MIGRATION_TIMEOUT=300

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

test_connection() {
    log_info "Testing MongoDB connection..."
    
    # Use Node.js to test connection since mongo CLI might not be available
    node -e "
        const { MongoClient } = require('mongodb');
        const uri = process.env.MONGODB_URI || '$MONGODB_URI';
        
        MongoClient.connect(uri, { 
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000 
        })
        .then(client => {
            console.log('✓ Database connection successful');
            return client.db().admin().ping();
        })
        .then(() => {
            console.log('✓ Database ping successful');
            process.exit(0);
        })
        .catch(error => {
            console.error('✗ Database connection failed:', error.message);
            process.exit(1);
        });
    "
    
    if [[ $? -eq 0 ]]; then
        log_success "MongoDB connection test passed"
    else
        log_error "MongoDB connection test failed"
        exit 1
    fi
}

create_backup() {
    log_info "Creating database backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Create backup using Node.js script
    node -e "
        const { MongoClient } = require('mongodb');
        const fs = require('fs');
        const path = require('path');
        
        const uri = process.env.MONGODB_URI || '$MONGODB_URI';
        const backupDir = '$BACKUP_DIR';
        
        async function createBackup() {
            const client = new MongoClient(uri, { useUnifiedTopology: true });
            
            try {
                await client.connect();
                const db = client.db();
                
                // Get all collections
                const collections = await db.listCollections().toArray();
                
                console.log('Creating backup for', collections.length, 'collections...');
                
                for (const collectionInfo of collections) {
                    const collectionName = collectionInfo.name;
                    const collection = db.collection(collectionName);
                    const documents = await collection.find({}).toArray();
                    
                    const backupFile = path.join(backupDir, collectionName + '.json');
                    fs.writeFileSync(backupFile, JSON.stringify(documents, null, 2));
                    
                    console.log('✓ Backed up collection:', collectionName, '(' + documents.length + ' documents)');
                }
                
                // Save database metadata
                const metadata = {
                    timestamp: new Date().toISOString(),
                    collections: collections.map(c => ({ name: c.name, type: c.type })),
                    indexes: {}
                };
                
                // Get indexes for each collection
                for (const collectionInfo of collections) {
                    const collectionName = collectionInfo.name;
                    const collection = db.collection(collectionName);
                    const indexes = await collection.listIndexes().toArray();
                    metadata.indexes[collectionName] = indexes;
                }
                
                fs.writeFileSync(path.join(backupDir, '_metadata.json'), JSON.stringify(metadata, null, 2));
                
                console.log('✓ Backup completed successfully');
                
            } catch (error) {
                console.error('✗ Backup failed:', error);
                process.exit(1);
            } finally {
                await client.close();
            }
        }
        
        createBackup();
    "
    
    if [[ $? -eq 0 ]]; then
        log_success "Database backup created at $BACKUP_DIR"
    else
        log_error "Database backup failed"
        exit 1
    fi
}

run_schema_migration() {
    log_info "Running schema migrations..."
    
    # Run schema migration using Node.js
    node -e "
        const { MongoClient } = require('mongodb');
        const uri = process.env.MONGODB_URI || '$MONGODB_URI';
        
        async function runMigrations() {
            const client = new MongoClient(uri, { useUnifiedTopology: true });
            
            try {
                await client.connect();
                const db = client.db();
                
                console.log('Running schema migrations...');
                
                // Migration 1: Ensure users collection has proper indexes
                console.log('Migration 1: Creating user indexes...');
                const users = db.collection('users');
                await users.createIndex({ email: 1 }, { unique: true });
                await users.createIndex({ username: 1 }, { unique: true });
                await users.createIndex({ createdAt: 1 });
                await users.createIndex({ tenantId: 1 });
                
                // Migration 2: Ensure transactions collection has proper indexes
                console.log('Migration 2: Creating transaction indexes...');
                const transactions = db.collection('transactions');
                await transactions.createIndex({ userId: 1 });
                await transactions.createIndex({ type: 1 });
                await transactions.createIndex({ status: 1 });
                await transactions.createIndex({ createdAt: -1 });
                await transactions.createIndex({ tenantId: 1 });
                await transactions.createIndex({ 'from.currency': 1, 'to.currency': 1 });
                
                // Migration 3: Ensure exchange_rates collection has proper indexes
                console.log('Migration 3: Creating exchange rate indexes...');
                const exchangeRates = db.collection('exchange_rates');
                await exchangeRates.createIndex({ from: 1, to: 1 });
                await exchangeRates.createIndex({ timestamp: -1 });
                await exchangeRates.createIndex({ tenantId: 1 });
                
                // Migration 4: Ensure sessions collection has proper indexes
                console.log('Migration 4: Creating session indexes...');
                const sessions = db.collection('sessions');
                await sessions.createIndex({ expires: 1 }, { expireAfterSeconds: 0 });
                await sessions.createIndex({ userId: 1 });
                
                // Migration 5: Ensure accounts collection has proper indexes
                console.log('Migration 5: Creating account indexes...');
                const accounts = db.collection('accounts');
                await accounts.createIndex({ userId: 1 });
                await accounts.createIndex({ currency: 1 });
                await accounts.createIndex({ tenantId: 1 });
                await accounts.createIndex({ accountNumber: 1 }, { unique: true });
                
                console.log('✓ Schema migrations completed successfully');
                
            } catch (error) {
                console.error('✗ Schema migration failed:', error);
                process.exit(1);
            } finally {
                await client.close();
            }
        }
        
        runMigrations();
    "
    
    if [[ $? -eq 0 ]]; then
        log_success "Schema migrations completed"
    else
        log_error "Schema migrations failed"
        exit 1
    fi
}

seed_production_data() {
    log_info "Seeding production data..."
    
    # Seed essential data for production
    node -e "
        const { MongoClient } = require('mongodb');
        const bcrypt = require('bcryptjs');
        const uri = process.env.MONGODB_URI || '$MONGODB_URI';
        
        async function seedData() {
            const client = new MongoClient(uri, { useUnifiedTopology: true });
            
            try {
                await client.connect();
                const db = client.db();
                
                console.log('Seeding production data...');
                
                // Seed default currencies
                const currencies = db.collection('currencies');
                const defaultCurrencies = [
                    { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, active: true },
                    { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, active: true },
                    { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2, active: true },
                    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0, active: true },
                    { code: 'BTC', name: 'Bitcoin', symbol: '₿', decimals: 8, active: true },
                    { code: 'ETH', name: 'Ethereum', symbol: 'Ξ', decimals: 18, active: true }
                ];
                
                for (const currency of defaultCurrencies) {
                    await currencies.updateOne(
                        { code: currency.code },
                        { \$setOnInsert: currency },
                        { upsert: true }
                    );
                }
                console.log('✓ Default currencies seeded');
                
                // Seed system configuration
                const config = db.collection('system_config');
                const defaultConfig = {
                    _id: 'system',
                    maintenance_mode: false,
                    registration_enabled: true,
                    email_verification_required: true,
                    two_factor_required: false,
                    max_transaction_amount: 100000,
                    min_transaction_amount: 1,
                    transaction_fee_percentage: 0.1,
                    updatedAt: new Date()
                };
                
                await config.updateOne(
                    { _id: 'system' },
                    { \$setOnInsert: defaultConfig },
                    { upsert: true }
                );
                console.log('✓ System configuration seeded');
                
                console.log('✓ Production data seeding completed');
                
            } catch (error) {
                console.error('✗ Data seeding failed:', error);
                process.exit(1);
            } finally {
                await client.close();
            }
        }
        
        seedData();
    "
    
    if [[ $? -eq 0 ]]; then
        log_success "Production data seeding completed"
    else
        log_warning "Production data seeding failed (this may be expected if data already exists)"
    fi
}

create_performance_indexes() {
    log_info "Creating performance optimization indexes..."
    
    node -e "
        const { MongoClient } = require('mongodb');
        const uri = process.env.MONGODB_URI || '$MONGODB_URI';
        
        async function createPerformanceIndexes() {
            const client = new MongoClient(uri, { useUnifiedTopology: true });
            
            try {
                await client.connect();
                const db = client.db();
                
                console.log('Creating performance indexes...');
                
                // Compound indexes for better query performance
                const transactions = db.collection('transactions');
                await transactions.createIndex({ userId: 1, status: 1, createdAt: -1 });
                await transactions.createIndex({ tenantId: 1, type: 1, createdAt: -1 });
                await transactions.createIndex({ status: 1, createdAt: -1 });
                
                const accounts = db.collection('accounts');
                await accounts.createIndex({ userId: 1, currency: 1 });
                await accounts.createIndex({ tenantId: 1, currency: 1 });
                
                const users = db.collection('users');
                await users.createIndex({ tenantId: 1, role: 1 });
                await users.createIndex({ email: 1, tenantId: 1 });
                
                // Text search indexes
                await users.createIndex({ 
                    firstName: 'text', 
                    lastName: 'text', 
                    email: 'text',
                    username: 'text'
                });
                
                console.log('✓ Performance indexes created');
                
            } catch (error) {
                console.error('✗ Performance index creation failed:', error);
                process.exit(1);
            } finally {
                await client.close();
            }
        }
        
        createPerformanceIndexes();
    "
    
    if [[ $? -eq 0 ]]; then
        log_success "Performance indexes created"
    else
        log_warning "Performance index creation failed"
    fi
}

log_migration_status() {
    log_info "Logging migration status..."
    
    node -e "
        const { MongoClient } = require('mongodb');
        const uri = process.env.MONGODB_URI || '$MONGODB_URI';
        
        async function logStatus() {
            const client = new MongoClient(uri, { useUnifiedTopology: true });
            
            try {
                await client.connect();
                const db = client.db();
                
                const migrationLog = db.collection('migration_log');
                await migrationLog.insertOne({
                    timestamp: new Date(),
                    type: 'migration',
                    status: 'completed',
                    version: '3.0.0',
                    environment: 'production',
                    flyRegion: process.env.FLY_REGION || 'unknown'
                });
                
                console.log('✓ Migration status logged');
                
            } catch (error) {
                console.error('✗ Migration logging failed:', error);
            } finally {
                await client.close();
            }
        }
        
        logStatus();
    "
}

# Main migration flow
main() {
    log_info "Starting database migration for Fly.io deployment..."
    
    test_connection
    create_backup
    run_schema_migration
    seed_production_data
    create_performance_indexes
    log_migration_status
    
    log_success "Database migration completed successfully!"
    log_info "Backup location: $BACKUP_DIR"
}

# Parse command line arguments
case "${1:-migrate}" in
    "migrate")
        main
        ;;
    "test")
        test_connection
        ;;
    "backup")
        test_connection
        create_backup
        ;;
    "schema")
        test_connection
        run_schema_migration
        ;;
    "seed")
        test_connection
        seed_production_data
        ;;
    "indexes")
        test_connection
        create_performance_indexes
        ;;
    *)
        echo "Usage: $0 [migrate|test|backup|schema|seed|indexes]"
        echo "  migrate - Run full migration (default)"
        echo "  test    - Test database connection"
        echo "  backup  - Create database backup only"
        echo "  schema  - Run schema migrations only"
        echo "  seed    - Seed production data only"
        echo "  indexes - Create performance indexes only"
        exit 1
        ;;
esac