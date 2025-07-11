const errorHandler = require('../utils/errorHandler');
const MonitoringService = require('../services/MonitoringService');
const { securityConfig } = require('../config/security');

describe('Enhanced Features', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            path: '/test',
            method: 'GET',
            ip: '127.0.0.1',
            get: jest.fn().mockReturnValue('test-agent')
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            header: jest.fn()
        };
        next = jest.fn();
    });

    describe('Error Handler', () => {
        it('should handle validation errors', () => {
            const error = new Error('Test validation error');
            error.name = 'ValidationError';
            error.errors = {
                field1: { message: 'Field 1 is required' },
                field2: { message: 'Field 2 is invalid' }
            };

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'خطای اعتبارسنجی',
                errors: ['Field 1 is required', 'Field 2 is invalid']
            });
        });

        it('should handle MongoDB duplicate key errors', () => {
            const error = new Error('Duplicate key error');
            error.name = 'MongoError';
            error.code = 11000;

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'داده تکراری'
            });
        });

        it('should handle JWT errors', () => {
            const error = new Error('Invalid token');
            error.name = 'JsonWebTokenError';

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'توکن نامعتبر است'
            });
        });

        it('should handle generic errors', () => {
            const error = new Error('Generic error');

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'خطای سرور'
            });
        });
    });

    describe('Monitoring Service', () => {
        it('should provide health check', async () => {
            const health = await MonitoringService.getHealthCheck();
            
            expect(health).toHaveProperty('status');
            expect(health).toHaveProperty('timestamp');
            expect(health).toHaveProperty('uptime');
            expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
        });

        it('should provide performance metrics', async () => {
            const metrics = await MonitoringService.getPerformanceMetrics();
            
            expect(metrics).toHaveProperty('transactions');
            expect(metrics).toHaveProperty('errors');
            expect(metrics).toHaveProperty('system');
            expect(metrics.transactions).toHaveProperty('hourly');
            expect(metrics.transactions).toHaveProperty('daily');
        });
    });

    describe('Security Config', () => {
        it('should be a function', () => {
            expect(typeof securityConfig).toBe('function');
        });

        it('should not throw when called with app mock', () => {
            const app = {
                use: jest.fn()
            };
            
            expect(() => securityConfig(app)).not.toThrow();
            expect(app.use).toHaveBeenCalled();
        });
    });
});