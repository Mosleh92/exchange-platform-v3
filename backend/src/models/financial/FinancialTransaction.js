// backend/src/models/financial/FinancialTransaction.js
const { Model, DataTypes } = require('sequelize');

class FinancialTransaction extends Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            transactionNumber: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true
            },
            tenantId: {
                type: DataTypes.UUID,
                allowNull: false
            },
            customerId: {
                type: DataTypes.UUID,
                allowNull: false
            },
            transactionType: {
                type: DataTypes.ENUM(
                    'CURRENCY_BUY', 'CURRENCY_SELL', 'DEPOSIT', 'WITHDRAWAL',
                    'TRANSFER', 'REMITTANCE', 'LOAN', 'INTEREST', 'FEE', 
                    'REFUND', 'ADJUSTMENT', 'P2P_TRADE'
                ),
                allowNull: false
            },
            fromCurrency: {
                type: DataTypes.STRING(3),
                allowNull: false
            },
            toCurrency: {
                type: DataTypes.STRING(3),
                allowNull: false
            },
            sourceAmount: {
                type: DataTypes.DECIMAL(20, 8),
                allowNull: false
            },
            destinationAmount: {
                type: DataTypes.DECIMAL(20, 8),
                allowNull: false
            },
            exchangeRate: {
                type: DataTypes.DECIMAL(20, 8),
                allowNull: false
            },
            feeAmount: {
                type: DataTypes.DECIMAL(20, 8),
                defaultValue: 0
            },
            feeCurrency: {
                type: DataTypes.STRING(3),
                allowNull: true
            },
            status: {
                type: DataTypes.ENUM(
                    'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 
                    'CANCELLED', 'REFUNDED', 'PARTIAL'
                ),
                defaultValue: 'PENDING'
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            reference: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            metadata: {
                type: DataTypes.JSONB,
                defaultValue: {}
            },
            externalReference: {
                type: DataTypes.STRING(255),
                allowNull: true
            },
            processedAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
            failedAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
            failureReason: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            createdBy: {
                type: DataTypes.UUID,
                allowNull: false
            },
            approvedBy: {
                type: DataTypes.UUID,
                allowNull: true
            },
            approvedAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
            version: {
                type: DataTypes.INTEGER,
                defaultValue: 1
            }
        }, {
            sequelize,
            modelName: 'FinancialTransaction',
            tableName: 'financial_transactions',
            timestamps: true,
            indexes: [
                {
                    unique: true,
                    fields: ['transactionNumber']
                },
                {
                    fields: ['tenantId', 'status', 'createdAt']
                },
                {
                    fields: ['tenantId', 'customerId', 'createdAt']
                },
                {
                    fields: ['tenantId', 'transactionType']
                },
                {
                    fields: ['fromCurrency', 'toCurrency']
                },
                {
                    fields: ['externalReference']
                },
                {
                    fields: ['processedAt']
                }
            ]
        });
    }

    static associate(models) {
        this.hasMany(models.LedgerEntry, {
            as: 'ledgerEntries',
            foreignKey: 'transactionId'
        });
        this.hasMany(models.FinancialAudit, {
            as: 'auditLogs',
            foreignKey: 'transactionId'
        });
    }

    // Instance methods
    async markAsProcessing(transaction) {
        await this.update({
            status: 'PROCESSING',
            processedAt: new Date()
        }, { transaction });
    }

    async markAsCompleted(transaction) {
        await this.update({
            status: 'COMPLETED',
            processedAt: new Date()
        }, { transaction });
    }

    async markAsFailed(reason, transaction) {
        await this.update({
            status: 'FAILED',
            failedAt: new Date(),
            failureReason: reason
        }, { transaction });
    }

    async cancel(reason, transaction) {
        await this.update({
            status: 'CANCELLED',
            failureReason: reason
        }, { transaction });
    }

    async approve(approvedBy, transaction) {
        await this.update({
            approvedBy,
            approvedAt: new Date()
        }, { transaction });
    }

    // Static methods
    static async generateTransactionNumber(tenantId) {
        const prefix = 'TXN';
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${prefix}${timestamp}${random}`;
    }

    static async findPendingTransactions(tenantId, limit = 100) {
        return await this.findAll({
            where: {
                tenantId,
                status: 'PENDING'
            },
            order: [['createdAt', 'ASC']],
            limit
        });
    }

    static async getTransactionStats(tenantId, startDate, endDate) {
        const { QueryTypes } = require('sequelize');
        
        const query = `
            SELECT 
                transaction_type,
                status,
                COUNT(*) as count,
                SUM(source_amount) as total_amount,
                AVG(source_amount) as avg_amount,
                SUM(fee_amount) as total_fees
            FROM financial_transactions 
            WHERE tenant_id = :tenantId 
            AND created_at BETWEEN :startDate AND :endDate
            GROUP BY transaction_type, status
            ORDER BY transaction_type, status
        `;

        return await this.sequelize.query(query, {
            replacements: { tenantId, startDate, endDate },
            type: QueryTypes.SELECT
        });
    }

    static async findByReference(reference, tenantId = null) {
        const where = { reference };
        if (tenantId) {
            where.tenantId = tenantId;
        }

        return await this.findOne({ where });
    }

    static async findByExternalReference(externalReference, tenantId = null) {
        const where = { externalReference };
        if (tenantId) {
            where.tenantId = tenantId;
        }

        return await this.findOne({ where });
    }
}

module.exports = FinancialTransaction;