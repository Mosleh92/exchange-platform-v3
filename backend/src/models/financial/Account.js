// backend/src/models/financial/Account.js
const { Model, DataTypes } = require('sequelize');

class Account extends Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            accountNumber: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true
            },
            accountType: {
                type: DataTypes.ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'),
                allowNull: false
            },
            accountName: {
                type: DataTypes.STRING(255),
                allowNull: false
            },
            currency: {
                type: DataTypes.STRING(3),
                allowNull: false,
                defaultValue: 'USD'
            },
            balance: {
                type: DataTypes.DECIMAL(20, 8),
                allowNull: false,
                defaultValue: 0
            },
            availableBalance: {
                type: DataTypes.DECIMAL(20, 8),
                allowNull: false,
                defaultValue: 0
            },
            blockedBalance: {
                type: DataTypes.DECIMAL(20, 8),
                allowNull: false,
                defaultValue: 0
            },
            tenantId: {
                type: DataTypes.UUID,
                allowNull: false
            },
            customerId: {
                type: DataTypes.UUID,
                allowNull: true // null for system accounts
            },
            parentAccountId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'accounts',
                    key: 'id'
                }
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                defaultValue: true
            },
            metadata: {
                type: DataTypes.JSONB,
                defaultValue: {}
            },
            createdBy: {
                type: DataTypes.UUID,
                allowNull: false
            },
            version: {
                type: DataTypes.INTEGER,
                defaultValue: 1 // For optimistic locking
            }
        }, {
            sequelize,
            modelName: 'Account',
            tableName: 'accounts',
            timestamps: true,
            indexes: [
                {
                    unique: true,
                    fields: ['accountNumber']
                },
                {
                    fields: ['tenantId', 'customerId']
                },
                {
                    fields: ['tenantId', 'accountType', 'currency']
                },
                {
                    fields: ['tenantId', 'isActive']
                }
            ]
        });
    }

    static associate(models) {
        this.belongsTo(models.Account, {
            as: 'parentAccount',
            foreignKey: 'parentAccountId'
        });
        this.hasMany(models.Account, {
            as: 'subAccounts',
            foreignKey: 'parentAccountId'
        });
        this.hasMany(models.LedgerEntry, {
            as: 'ledgerEntries',
            foreignKey: 'accountId'
        });
    }

    // Instance methods
    async updateBalance(amount, transaction) {
        // Optimistic locking
        const currentVersion = this.version;
        
        const [updatedRows] = await this.constructor.update({
            balance: this.balance + amount,
            availableBalance: this.availableBalance + amount,
            version: currentVersion + 1
        }, {
            where: {
                id: this.id,
                version: currentVersion
            },
            transaction
        });

        if (updatedRows === 0) {
            throw new Error('تراکنش ناموفق: داده‌ها تغییر کرده‌اند');
        }

        this.balance += amount;
        this.availableBalance += amount;
        this.version = currentVersion + 1;
    }

    async blockAmount(amount, transaction) {
        if (this.availableBalance < amount) {
            throw new Error('موجودی کافی نیست');
        }

        const currentVersion = this.version;
        
        const [updatedRows] = await this.constructor.update({
            availableBalance: this.availableBalance - amount,
            blockedBalance: this.blockedBalance + amount,
            version: currentVersion + 1
        }, {
            where: {
                id: this.id,
                version: currentVersion
            },
            transaction
        });

        if (updatedRows === 0) {
            throw new Error('تراکنش ناموفق: داده‌ها تغییر کرده‌اند');
        }

        this.availableBalance -= amount;
        this.blockedBalance += amount;
        this.version = currentVersion + 1;
    }

    async unblockAmount(amount, transaction) {
        const currentVersion = this.version;
        
        const [updatedRows] = await this.constructor.update({
            availableBalance: this.availableBalance + amount,
            blockedBalance: this.blockedBalance - amount,
            version: currentVersion + 1
        }, {
            where: {
                id: this.id,
                version: currentVersion
            },
            transaction
        });

        if (updatedRows === 0) {
            throw new Error('تراکنش ناموفق: داده‌ها تغییر کرده‌اند');
        }

        this.availableBalance += amount;
        this.blockedBalance -= amount;
        this.version = currentVersion + 1;
    }

    // Static methods
    static async generateAccountNumber(tenantId, accountType) {
        const typePrefix = {
            'ASSET': '1',
            'LIABILITY': '2',
            'EQUITY': '3',
            'REVENUE': '4',
            'EXPENSE': '5'
        };

        const prefix = typePrefix[accountType];
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        return `${prefix}${timestamp}${random}`;
    }

    static async findByTenantAndType(tenantId, accountType, currency = null) {
        const where = {
            tenantId,
            accountType,
            isActive: true
        };

        if (currency) {
            where.currency = currency;
        }

        return await this.findAll({ where });
    }

    static async findCustomerAccount(tenantId, customerId, currency) {
        return await this.findOne({
            where: {
                tenantId,
                customerId,
                currency,
                accountType: 'ASSET',
                isActive: true
            }
        });
    }

    static async createCustomerAccount(tenantId, customerId, currency, createdBy, transaction) {
        const accountNumber = await this.generateAccountNumber(tenantId, 'ASSET');
        
        return await this.create({
            accountNumber,
            accountType: 'ASSET',
            accountName: `Customer ${currency} Account`,
            currency,
            tenantId,
            customerId,
            createdBy
        }, { transaction });
    }
}

module.exports = Account;