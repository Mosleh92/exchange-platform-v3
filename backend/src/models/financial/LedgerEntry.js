// backend/src/models/financial/LedgerEntry.js
const { Model, DataTypes } = require('sequelize');

class LedgerEntry extends Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            entryNumber: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true
            },
            tenantId: {
                type: DataTypes.UUID,
                allowNull: false
            },
            transactionId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'financial_transactions',
                    key: 'id'
                }
            },
            accountId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'accounts',
                    key: 'id'
                }
            },
            entryType: {
                type: DataTypes.ENUM('DEBIT', 'CREDIT'),
                allowNull: false
            },
            amount: {
                type: DataTypes.DECIMAL(20, 8),
                allowNull: false
            },
            currency: {
                type: DataTypes.STRING(3),
                allowNull: false
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            reference: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            postingDate: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            },
            valueDate: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            },
            isPosted: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            postedAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
            postedBy: {
                type: DataTypes.UUID,
                allowNull: true
            },
            reversalEntryId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'ledger_entries',
                    key: 'id'
                }
            },
            isReversed: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            reversedAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
            reversedBy: {
                type: DataTypes.UUID,
                allowNull: true
            },
            metadata: {
                type: DataTypes.JSONB,
                defaultValue: {}
            },
            createdBy: {
                type: DataTypes.UUID,
                allowNull: false
            }
        }, {
            sequelize,
            modelName: 'LedgerEntry',
            tableName: 'ledger_entries',
            timestamps: true,
            indexes: [
                {
                    unique: true,
                    fields: ['entryNumber']
                },
                {
                    fields: ['tenantId', 'postingDate']
                },
                {
                    fields: ['transactionId']
                },
                {
                    fields: ['accountId', 'postingDate']
                },
                {
                    fields: ['tenantId', 'accountId', 'currency']
                },
                {
                    fields: ['isPosted', 'postingDate']
                },
                {
                    fields: ['isReversed']
                },
                {
                    fields: ['reversalEntryId']
                }
            ]
        });
    }

    static associate(models) {
        this.belongsTo(models.FinancialTransaction, {
            as: 'transaction',
            foreignKey: 'transactionId'
        });
        this.belongsTo(models.Account, {
            as: 'account',
            foreignKey: 'accountId'
        });
        this.belongsTo(models.LedgerEntry, {
            as: 'reversalEntry',
            foreignKey: 'reversalEntryId'
        });
        this.hasOne(models.LedgerEntry, {
            as: 'reversedByEntry',
            foreignKey: 'reversalEntryId'
        });
    }

    // Instance methods
    async post(postedBy, transaction) {
        if (this.isPosted) {
            throw new Error('Entry already posted');
        }

        await this.update({
            isPosted: true,
            postedAt: new Date(),
            postedBy
        }, { transaction });
    }

    async reverse(reversedBy, reverseReason, transaction) {
        if (this.isReversed) {
            throw new Error('Entry already reversed');
        }

        if (!this.isPosted) {
            throw new Error('Cannot reverse unposted entry');
        }

        // Create reversal entry
        const reversalEntry = await this.constructor.create({
            entryNumber: await this.constructor.generateEntryNumber(this.tenantId),
            tenantId: this.tenantId,
            transactionId: this.transactionId,
            accountId: this.accountId,
            entryType: this.entryType === 'DEBIT' ? 'CREDIT' : 'DEBIT',
            amount: this.amount,
            currency: this.currency,
            description: `Reversal of ${this.description} - ${reverseReason}`,
            reference: this.reference,
            postingDate: new Date(),
            valueDate: new Date(),
            isPosted: true,
            postedAt: new Date(),
            postedBy: reversedBy,
            reversalEntryId: this.id,
            metadata: {
                ...this.metadata,
                reversalReason: reverseReason,
                originalEntryId: this.id
            },
            createdBy: reversedBy
        }, { transaction });

        // Mark original entry as reversed
        await this.update({
            isReversed: true,
            reversedAt: new Date(),
            reversedBy
        }, { transaction });

        return reversalEntry;
    }

    // Static methods
    static async generateEntryNumber(tenantId) {
        const prefix = 'LE';
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${prefix}${timestamp}${random}`;
    }

    static async createDoubleEntry(transactionId, debitAccountId, creditAccountId, amount, currency, description, createdBy, tenantId, dbTransaction) {
        const entryNumberDebit = await this.generateEntryNumber(tenantId);
        const entryNumberCredit = await this.generateEntryNumber(tenantId);

        // Create debit entry
        const debitEntry = await this.create({
            entryNumber: entryNumberDebit,
            tenantId,
            transactionId,
            accountId: debitAccountId,
            entryType: 'DEBIT',
            amount,
            currency,
            description: `${description} (Debit)`,
            createdBy
        }, { transaction: dbTransaction });

        // Create credit entry
        const creditEntry = await this.create({
            entryNumber: entryNumberCredit,
            tenantId,
            transactionId,
            accountId: creditAccountId,
            entryType: 'CREDIT',
            amount,
            currency,
            description: `${description} (Credit)`,
            createdBy
        }, { transaction: dbTransaction });

        return { debitEntry, creditEntry };
    }

    static async getAccountBalance(accountId, asOfDate = null) {
        const { QueryTypes } = require('sequelize');
        
        let whereClause = 'WHERE account_id = :accountId AND is_posted = true AND is_reversed = false';
        const replacements = { accountId };

        if (asOfDate) {
            whereClause += ' AND posting_date <= :asOfDate';
            replacements.asOfDate = asOfDate;
        }

        const query = `
            SELECT 
                COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END), 0) as total_debits,
                COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END), 0) as total_credits,
                COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE -amount END), 0) as balance
            FROM ledger_entries
            ${whereClause}
        `;

        const result = await this.sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });

        return result[0] || { total_debits: 0, total_credits: 0, balance: 0 };
    }

    static async getTrialBalance(tenantId, asOfDate = null) {
        const { QueryTypes } = require('sequelize');
        
        let whereClause = 'le.tenant_id = :tenantId AND le.is_posted = true AND le.is_reversed = false';
        const replacements = { tenantId };

        if (asOfDate) {
            whereClause += ' AND le.posting_date <= :asOfDate';
            replacements.asOfDate = asOfDate;
        }

        const query = `
            SELECT 
                a.id as account_id,
                a.account_number,
                a.account_name,
                a.account_type,
                a.currency,
                COALESCE(SUM(CASE WHEN le.entry_type = 'DEBIT' THEN le.amount ELSE 0 END), 0) as total_debits,
                COALESCE(SUM(CASE WHEN le.entry_type = 'CREDIT' THEN le.amount ELSE 0 END), 0) as total_credits,
                COALESCE(SUM(CASE WHEN le.entry_type = 'DEBIT' THEN le.amount ELSE -le.amount END), 0) as balance
            FROM accounts a
            LEFT JOIN ledger_entries le ON a.id = le.account_id AND ${whereClause}
            WHERE a.tenant_id = :tenantId AND a.is_active = true
            GROUP BY a.id, a.account_number, a.account_name, a.account_type, a.currency
            ORDER BY a.account_number
        `;

        return await this.sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });
    }

    static async findUnpostedEntries(tenantId, limit = 100) {
        return await this.findAll({
            where: {
                tenantId,
                isPosted: false
            },
            order: [['createdAt', 'ASC']],
            limit,
            include: [
                {
                    model: this.sequelize.models.Account,
                    as: 'account'
                },
                {
                    model: this.sequelize.models.FinancialTransaction,
                    as: 'transaction'
                }
            ]
        });
    }

    static async validateDoubleEntry(transactionId) {
        const { QueryTypes } = require('sequelize');
        
        const query = `
            SELECT 
                SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) as total_debits,
                SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) as total_credits,
                COUNT(*) as entry_count
            FROM ledger_entries
            WHERE transaction_id = :transactionId AND is_posted = true
        `;

        const result = await this.sequelize.query(query, {
            replacements: { transactionId },
            type: QueryTypes.SELECT
        });

        const { total_debits, total_credits, entry_count } = result[0];
        
        return {
            isBalanced: Math.abs(total_debits - total_credits) < 0.01,
            totalDebits: parseFloat(total_debits) || 0,
            totalCredits: parseFloat(total_credits) || 0,
            entryCount: parseInt(entry_count) || 0
        };
    }
}

module.exports = LedgerEntry;