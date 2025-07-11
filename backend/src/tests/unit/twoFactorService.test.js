// backend/src/tests/unit/twoFactorService.test.js
describe('TwoFactorAuthService', () => {
    let TwoFactorAuthService;
    let User;
    let sendSMS;

    beforeAll(() => {
        // Mock dependencies without requiring setup.js
        jest.doMock('../../models/User', () => ({
            findById: jest.fn()
        }));
        
        jest.doMock('../../services/external/smsService', () => ({
            sendSMS: jest.fn()
        }));

        // Set test environment variables
        process.env.SMS_SALT = 'test-salt';
        process.env.SMS_PROVIDER = 'test';
        process.env.SMS_API_KEY = 'test-key';
        process.env.SMS_FROM_NUMBER = 'test-number';

        // Require after mocking
        TwoFactorAuthService = require('../../services/twoFactorAuthService');
        User = require('../../models/User');
        const smsModule = require('../../services/external/smsService');
        sendSMS = smsModule.sendSMS;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generateSMSCode', () => {
        it('should generate and send SMS code for valid user', async () => {
            // Mock user
            const mockUser = {
                id: 'userId123',
                phone: '+989123456789',
                save: jest.fn().mockResolvedValue(true)
            };
            
            User.findById.mockResolvedValue(mockUser);
            sendSMS.mockResolvedValue({ success: true });

            const result = await TwoFactorAuthService.generateSMSCode('userId123');

            expect(result.success).toBe(true);
            expect(result.message).toContain('کد تایید به شماره شما ارسال شد');
            expect(mockUser.save).toHaveBeenCalled();
            expect(sendSMS).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: '+989123456789',
                    text: expect.stringContaining('کد تایید صرافی')
                })
            );
        });

        it('should throw error for user without phone', async () => {
            const mockUser = {
                id: 'userId123',
                phone: null
            };
            
            User.findById.mockResolvedValue(mockUser);

            await expect(TwoFactorAuthService.generateSMSCode('userId123'))
                .rejects.toThrow('شماره تلفن کاربر یافت نشد');
        });

        it('should throw error for non-existent user', async () => {
            User.findById.mockResolvedValue(null);

            await expect(TwoFactorAuthService.generateSMSCode('userId123'))
                .rejects.toThrow('کاربر یافت نشد');
        });
    });

    describe('verifySMSCode', () => {
        it('should verify valid SMS code', async () => {
            const mockUser = {
                id: 'userId123',
                smsCode: 'hashedCode',
                smsCodeExpiry: new Date(Date.now() + 5 * 60 * 1000),
                save: jest.fn().mockResolvedValue(true)
            };
            
            User.findById.mockResolvedValue(mockUser);
            
            // Mock hash function
            const originalHashSMSCode = TwoFactorAuthService.hashSMSCode;
            TwoFactorAuthService.hashSMSCode = jest.fn().mockReturnValue('hashedCode');

            const result = await TwoFactorAuthService.verifySMSCode('userId123', '123456');

            expect(result).toBe(true);
            expect(mockUser.smsCode).toBe(null);
            expect(mockUser.smsCodeExpiry).toBe(null);
            expect(mockUser.save).toHaveBeenCalled();

            // Restore original function
            TwoFactorAuthService.hashSMSCode = originalHashSMSCode;
        });

        it('should reject expired SMS code', async () => {
            const mockUser = {
                id: 'userId123',
                smsCode: 'hashedCode',
                smsCodeExpiry: new Date(Date.now() - 1000) // Expired
            };
            
            User.findById.mockResolvedValue(mockUser);

            await expect(TwoFactorAuthService.verifySMSCode('userId123', '123456'))
                .rejects.toThrow('کد SMS منقضی شده است');
        });

        it('should reject invalid SMS code', async () => {
            const mockUser = {
                id: 'userId123',
                smsCode: 'hashedCode',
                smsCodeExpiry: new Date(Date.now() + 5 * 60 * 1000)
            };
            
            User.findById.mockResolvedValue(mockUser);
            
            // Mock hash function to return different hash
            const originalHashSMSCode = TwoFactorAuthService.hashSMSCode;
            TwoFactorAuthService.hashSMSCode = jest.fn().mockReturnValue('differentHash');

            await expect(TwoFactorAuthService.verifySMSCode('userId123', '123456'))
                .rejects.toThrow('کد SMS نامعتبر است');

            // Restore original function
            TwoFactorAuthService.hashSMSCode = originalHashSMSCode;
        });
    });

    describe('is2FARequired', () => {
        it('should return true for super_admin role', () => {
            expect(TwoFactorAuthService.is2FARequired('super_admin')).toBe(true);
        });

        it('should return true for tenant_admin role', () => {
            expect(TwoFactorAuthService.is2FARequired('tenant_admin')).toBe(true);
        });

        it('should return false for manager role', () => {
            expect(TwoFactorAuthService.is2FARequired('manager')).toBe(false);
        });

        it('should return false for staff role', () => {
            expect(TwoFactorAuthService.is2FARequired('staff')).toBe(false);
        });

        it('should return false for customer role', () => {
            expect(TwoFactorAuthService.is2FARequired('customer')).toBe(false);
        });
    });

    describe('enforce2FAForUser', () => {
        it('should pass for admin user with 2FA enabled', async () => {
            const mockUser = {
                id: 'userId123',
                role: 'super_admin',
                twoFactorEnabled: true
            };
            
            User.findById.mockResolvedValue(mockUser);

            const result = await TwoFactorAuthService.enforce2FAForUser('userId123');
            expect(result).toBe(true);
        });

        it('should throw error for admin user without 2FA', async () => {
            const mockUser = {
                id: 'userId123',
                role: 'super_admin',
                twoFactorEnabled: false
            };
            
            User.findById.mockResolvedValue(mockUser);

            await expect(TwoFactorAuthService.enforce2FAForUser('userId123'))
                .rejects.toThrow('کاربران مدیر باید 2FA را فعال کنند');
        });

        it('should pass for non-admin user without 2FA', async () => {
            const mockUser = {
                id: 'userId123',
                role: 'staff',
                twoFactorEnabled: false
            };
            
            User.findById.mockResolvedValue(mockUser);

            const result = await TwoFactorAuthService.enforce2FAForUser('userId123');
            expect(result).toBe(true);
        });

        it('should throw error for non-existent user', async () => {
            User.findById.mockResolvedValue(null);

            await expect(TwoFactorAuthService.enforce2FAForUser('userId123'))
                .rejects.toThrow('کاربر یافت نشد');
        });
    });

    describe('generateBackupCodes', () => {
        it('should generate 10 backup codes', () => {
            const codes = TwoFactorAuthService.generateBackupCodes();
            
            expect(codes).toHaveLength(10);
            expect(codes.every(code => code.length === 8)).toBe(true);
            expect(codes.every(code => /^[A-F0-9]+$/.test(code))).toBe(true);
        });

        it('should generate unique codes', () => {
            const codes = TwoFactorAuthService.generateBackupCodes();
            const uniqueCodes = [...new Set(codes)];
            
            expect(uniqueCodes).toHaveLength(codes.length);
        });
    });

    describe('hashSMSCode', () => {
        it('should consistently hash the same code', () => {
            const code = '123456';
            const hash1 = TwoFactorAuthService.hashSMSCode(code);
            const hash2 = TwoFactorAuthService.hashSMSCode(code);
            
            expect(hash1).toBe(hash2);
            expect(hash1).toBeTruthy();
            expect(hash1.length).toBe(64); // SHA-256 hex length
        });

        it('should generate different hashes for different codes', () => {
            const hash1 = TwoFactorAuthService.hashSMSCode('123456');
            const hash2 = TwoFactorAuthService.hashSMSCode('654321');
            
            expect(hash1).not.toBe(hash2);
        });
    });
});