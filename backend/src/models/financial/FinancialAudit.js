// backend/src/models/financial/FinancialAudit.js
const { Model, DataTypes } = require('sequelize');

class FinancialAudit extends Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            auditNumber: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true
            },
            tenantId: {
                type: DataTypes.UUID,
                allowNull: false
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false
            },
            action: {
                type: DataTypes.ENUM(
                    // Financial Transaction Actions
                    'TRANSACTION_CREATED', 'TRANSACTION_UPDATED', 'TRANSACTION_CANCELLED',
                    'TRANSACTION_APPROVED', 'TRANSACTION_REJECTED', 'TRANSACTION_PROCESSED',
                    'TRANSACTION_FAILED', 'TRANSACTION_REFUNDED',
                    
                    // Account Actions
                    'ACCOUNT_CREATED', 'ACCOUNT_UPDATED', 'ACCOUNT_CLOSED',
                    'ACCOUNT_BALANCE_UPDATED', 'ACCOUNT_BLOCKED', 'ACCOUNT_UNBLOCKED',
                    
                    // Ledger Actions
                    'LEDGER_ENTRY_CREATED', 'LEDGER_ENTRY_POSTED', 'LEDGER_ENTRY_REVERSED',
                    
                    // Security Actions
                    'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGED',
                    'TWO_FACTOR_ENABLED', 'TWO_FACTOR_DISABLED', 'API_ACCESS',
                    
                    // System Actions
                    'BACKUP_CREATED', 'BACKUP_RESTORED', 'SYSTEM_MAINTENANCE',
                    'CONFIG_CHANGED', 'RATE_UPDATED',
                    
                    // Compliance Actions
                    'KYC_SUBMITTED', 'KYC_APPROVED', 'KYC_REJECTED',
                    'AML_CHECK_TRIGGERED', 'SUSPICIOUS_ACTIVITY_DETECTED',
                    
                    // General
                    'OTHER'
                ),
                allowNull: false
            },
            resourceType: {
                type: DataTypes.ENUM(
                    'FINANCIAL_TRANSACTION', 'ACCOUNT', 'LEDGER_ENTRY',
                    'USER', 'CUSTOMER', 'EXCHANGE_RATE', 'SYSTEM',
                    'API_REQUEST', 'DOCUMENT', 'OTHER'
                ),
                allowNull: false
            },
            resourceId: {
                type: DataTypes.UUID,
                allowNull: true
            },
            transactionId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'financial_transactions',
                    key: 'id'
                }
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            oldValues: {
                type: DataTypes.JSONB,
                allowNull: true
            },
            newValues: {
                type: DataTypes.JSONB,
                allowNull: true
            },
            metadata: {
                type: DataTypes.JSONB,
                defaultValue: {}
            },
            ipAddress: {
                type: DataTypes.INET,
                allowNull: true
            },
            userAgent: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            requestMethod: {
                type: DataTypes.STRING(10),
                allowNull: true
            },
            requestUrl: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            responseCode: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            processingTime: {
                type: DataTypes.INTEGER, // milliseconds
                allowNull: true
            },
            severity: {
                type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
                defaultValue: 'MEDIUM'
            },
            riskScore: {
                type: DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    min: 0,
                    max: 100
                }
            },
            sessionId: {
                type: DataTypes.STRING(255),
                allowNull: true
            },
            location: {
                type: DataTypes.JSONB,
                allowNull: true
            },
            deviceFingerprint: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            tags: {
                type: DataTypes.ARRAY(DataTypes.STRING),
                defaultValue: []
            },
            isRetention: {
                type: DataTypes.BOOLEAN,
                defaultValue: false // For long-term retention requirements
            },
            retentionUntil: {
                type: DataTypes.DATE,
                allowNull: true
            }
        }, {
            sequelize,
            modelName: 'FinancialAudit',
            tableName: 'financial_audits',
            timestamps: true,
            indexes: [
                {
                    unique: true,
                    fields: ['auditNumber']
                },
                {
                    fields: ['tenantId', 'createdAt']
                },
                {
                    fields: ['userId', 'createdAt']
                },
                {
                    fields: ['action', 'createdAt']
                },
                {
                    fields: ['resourceType', 'resourceId']
                },
                {
                    fields: ['transactionId']
                },
                {
                    fields: ['severity', 'createdAt']
                },
                {
                    fields: ['riskScore']
                },
                {
                    fields: ['ipAddress', 'createdAt']
                },
                {
                    fields: ['sessionId']
                },
                {
                    fields: ['tags']
                },
                {
                    fields: ['isRetention', 'retentionUntil']
                }
            ]
        });
    }

    static associate(models) {
        this.belongsTo(models.FinancialTransaction, {
            as: 'transaction',
            foreignKey: 'transactionId'
        });
    }

    // Static methods
    static async generateAuditNumber(tenantId) {
        const prefix = 'AUD';
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${prefix}${timestamp}${random}`;
    }

    static async logAction(data) {
        try {
            const auditNumber = await this.generateAuditNumber(data.tenantId);
            
            // Calculate risk score based on action and context
            const riskScore = this.calculateRiskScore(data);
            
            // Set retention period based on severity and compliance requirements
            const retentionUntil = this.calculateRetentionPeriod(data.severity, data.action);
            
            const auditLog = await this.create({
                auditNumber,
                tenantId: data.tenantId,
                userId: data.userId,
                action: data.action,
                resourceType: data.resourceType,
                resourceId: data.resourceId,
                transactionId: data.transactionId,
                description: data.description,
                oldValues: data.oldValues,
                newValues: data.newValues,
                metadata: data.metadata || {},
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
                requestMethod: data.requestMethod,
                requestUrl: data.requestUrl,
                responseCode: data.responseCode,
                processingTime: data.processingTime,
                severity: data.severity || 'MEDIUM',
                riskScore,
                sessionId: data.sessionId,
                location: data.location,
                deviceFingerprint: data.deviceFingerprint,
                tags: data.tags || [],
                isRetention: riskScore >= 70 || data.severity === 'CRITICAL',
                retentionUntil
            });

            // Trigger alerts for high-risk activities
            if (riskScore >= 80 || data.severity === 'CRITICAL') {
                await this.triggerSecurityAlert(auditLog);
            }

            return auditLog;
        } catch (error) {
            console.error('Failed to create audit log:', error);
            throw error;
        }
    }

    static calculateRiskScore(data) {
        let score = 0;

        // Base score by action type
        const actionRiskScores = {
            'TRANSACTION_CREATED': 30,
            'TRANSACTION_CANCELLED': 40,
            'TRANSACTION_FAILED': 50,
            'ACCOUNT_BALANCE_UPDATED': 40,
            'ACCOUNT_BLOCKED': 60,
            'LOGIN_FAILED': 70,
            'SUSPICIOUS_ACTIVITY_DETECTED': 90,
            'AML_CHECK_TRIGGERED': 85,
            'SYSTEM_MAINTENANCE': 20,
            'CONFIG_CHANGED': 50
        };

        score = actionRiskScores[data.action] || 30;

        // Increase score for high-value transactions
        if (data.metadata && data.metadata.amount > 10000) {
            score += 20;
        }

        // Increase score for unusual IP addresses
        if (data.metadata && data.metadata.isNewIP) {
            score += 15;
        }

        // Increase score for failed operations
        if (data.responseCode >= 400) {
            score += 25;
        }

        // Increase score for off-hours activity
        const hour = new Date().getHours();
        if (hour < 6 || hour > 22) {
            score += 10;
        }

        return Math.min(100, score);
    }

    static calculateRetentionPeriod(severity, action) {
        const now = new Date();
        let years = 7; // Default compliance retention

        switch (severity) {
            case 'CRITICAL':
                years = 10;
                break;
            case 'HIGH':
                years = 8;
                break;
            case 'MEDIUM':
                years = 7;
                break;
            case 'LOW':
                years = 5;
                break;
        }

        // Special retention for certain actions
        if (action.includes('AML') || action.includes('SUSPICIOUS')) {
            years = 10;
        }

        if (action.includes('KYC')) {
            years = 8;
        }

        const retentionDate = new Date(now);
        retentionDate.setFullYear(retentionDate.getFullYear() + years);
        
        return retentionDate;
    }

    static async triggerSecurityAlert(auditLog) {
        // Implementation for security alerts
        // This would typically send notifications to security team
        console.log(`Security Alert: High-risk activity detected - ${auditLog.action} by user ${auditLog.userId}`);
        
        // Could implement:
        // - Email notifications
        // - Slack/Teams alerts
        // - SMS alerts for critical events
        // - Dashboard notifications
        // - Automated account suspension for critical threats
    }

    static async getAuditTrail(resourceType, resourceId, options = {}) {
        const { limit = 100, offset = 0 } = options;
        
        return await this.findAndCountAll({
            where: {
                resourceType,
                resourceId
            },
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });
    }

    static async getSecurityEvents(tenantId, days = 30, severity = null) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const where = {
            tenantId,
            createdAt: {
                [this.sequelize.Sequelize.Op.gte]: startDate
            },
            action: {
                [this.sequelize.Sequelize.Op.in]: [
                    'LOGIN_FAILED', 'SUSPICIOUS_ACTIVITY_DETECTED',
                    'AML_CHECK_TRIGGERED', 'ACCOUNT_BLOCKED'
                ]
            }
        };

        if (severity) {
            where.severity = severity;
        }

        return await this.findAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: 1000
        });
    }

    static async getComplianceReport(tenantId, startDate, endDate) {
        const { QueryTypes } = require('sequelize');
        
        const query = `
            SELECT 
                action,
                resource_type,
                severity,
                COUNT(*) as count,
                AVG(risk_score) as avg_risk_score,
                MAX(risk_score) as max_risk_score,
                COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical_count,
                COUNT(CASE WHEN severity = 'HIGH' THEN 1 END) as high_count
            FROM financial_audits
            WHERE tenant_id = :tenantId 
            AND created_at BETWEEN :startDate AND :endDate
            GROUP BY action, resource_type, severity
            ORDER BY max_risk_score DESC, count DESC
        `;

        return await this.sequelize.query(query, {
            replacements: { tenantId, startDate, endDate },
            type: QueryTypes.SELECT
        });
    }

    static async cleanupOldAudits(tenantId = null) {
        const where = {
            isRetention: false,
            retentionUntil: {
                [this.sequelize.Sequelize.Op.lt]: new Date()
            }
        };

        if (tenantId) {
            where.tenantId = tenantId;
        }

        const deletedCount = await this.destroy({ where });
        
        return {
            deletedCount,
            message: `Cleaned up ${deletedCount} audit records`
        };
    }
}

module.exports = FinancialAudit;