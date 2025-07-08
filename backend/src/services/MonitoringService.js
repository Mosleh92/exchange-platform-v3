const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const ExchangeRate = require('../models/ExchangeRate');
const { logger } = require('../utils/logger');

class MonitoringService {
    static async getSystemStatus() {
        const dbStatus = mongoose.connection.readyState === 1;
        
        // بررسی نرخهای ارز
        const latestRates = await ExchangeRate.find()
            .sort({ createdAt: -1 })
            .limit(1);
        
        const ratesStatus = latestRates.length > 0 && 
            (Date.now() - latestRates[0].createdAt) < 3600000; // 1 ساعت

        // آمار تراکنشها
        const transactionStats = await Transaction.aggregate([
            {
                $match: {
                    createdAt: { $gte: new Date(Date.now() - 86400000) } // 24 ساعت گذشته
                }
            },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                    totalAmount: { $sum: "$amount" }
                }
            }
        ]);

        return {
            database: {
                status: dbStatus ? 'آنلاین' : 'آفلاین',
                connections: mongoose.connection.states
            },
            exchangeRates: {
                status: ratesStatus ? 'بهروز' : 'نیاز به بهروزرسانی',
                lastUpdate: latestRates[0]?.createdAt
            },
            transactions: {
                stats: transactionStats,
                performance: {
                    avgResponseTime: await this.calculateAvgResponseTime()
                }
            }
        };
    }

    static async calculateAvgResponseTime() {
        // محاسبه میانگین زمان پاسخدهی
        const transactions = await Transaction.find({
            createdAt: { $gte: new Date(Date.now() - 3600000) } // 1 ساعت گذشته
        });

        if (transactions.length === 0) return 0;

        const totalTime = transactions.reduce((sum, t) => {
            return sum + (t.completedAt - t.createdAt);
        }, 0);

        return totalTime / transactions.length;
    }

    static async getHealthCheck() {
        try {
            const systemStatus = await this.getSystemStatus();
            
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                database: systemStatus.database,
                services: {
                    exchangeRates: systemStatus.exchangeRates.status === 'بهروز' ? 'healthy' : 'warning',
                    transactions: systemStatus.transactions.stats.length > 0 ? 'healthy' : 'warning'
                }
            };

            // تعیین وضعیت کلی
            if (!systemStatus.database.status || systemStatus.database.status === 'آفلاین') {
                health.status = 'unhealthy';
            } else if (health.services.exchangeRates === 'warning' || health.services.transactions === 'warning') {
                health.status = 'degraded';
            }

            return health;
        } catch (error) {
            logger.error('Health check failed:', error);
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }

    static async getPerformanceMetrics() {
        try {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 3600000);
            const oneDayAgo = new Date(now.getTime() - 86400000);

            // تراکنش‌های ساعت گذشته
            const hourlyTransactions = await Transaction.countDocuments({
                createdAt: { $gte: oneHourAgo }
            });

            // تراکنش‌های روز گذشته
            const dailyTransactions = await Transaction.countDocuments({
                createdAt: { $gte: oneDayAgo }
            });

            // میانگین زمان پردازش
            const avgProcessingTime = await this.calculateAvgResponseTime();

            // آمار خطاها
            const errorStats = await Transaction.aggregate([
                {
                    $match: {
                        createdAt: { $gte: oneDayAgo },
                        status: 'failed'
                    }
                },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 }
                    }
                }
            ]);

            return {
                transactions: {
                    hourly: hourlyTransactions,
                    daily: dailyTransactions,
                    avgProcessingTime: avgProcessingTime
                },
                errors: {
                    daily: errorStats.length > 0 ? errorStats[0].count : 0,
                    errorRate: dailyTransactions > 0 ? 
                        (errorStats.length > 0 ? errorStats[0].count : 0) / dailyTransactions * 100 : 0
                },
                system: {
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    cpu: process.cpuUsage()
                }
            };
        } catch (error) {
            logger.error('Performance metrics collection failed:', error);
            throw error;
        }
    }
}

module.exports = MonitoringService;