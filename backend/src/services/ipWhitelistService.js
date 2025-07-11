// backend/src/services/ipWhitelistService.js
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { isIPv4, isIPv6 } = require('net');

class IPWhitelistService {
    /**
     * Add IP to user's whitelist
     */
    async addIP(userId, ipAddress, description = '') {
        try {
            if (!this.isValidIP(ipAddress)) {
                throw new Error('آدرس IP نامعتبر است');
            }

            const user = await User.findById(userId);
            if (!user) {
                throw new Error('کاربر یافت نشد');
            }

            // Check if IP already exists
            const existingIP = user.ipWhitelist.find(item => item.ip === ipAddress);
            if (existingIP) {
                throw new Error('این آدرس IP قبلاً اضافه شده است');
            }

            // Add IP to whitelist
            user.ipWhitelist.push({
                ip: ipAddress,
                description: description || `IP اضافه شده در ${new Date().toLocaleString('fa-IR')}`,
                addedAt: new Date()
            });

            await user.save();

            // Log the action
            await AuditLog.create({
                userId: userId,
                action: 'ADD_IP_WHITELIST',
                resource: 'Security',
                resourceId: userId,
                details: `IP ${ipAddress} به لیست سفید اضافه شد`,
                metadata: {
                    ip: ipAddress,
                    description: description
                }
            });

            return {
                success: true,
                ip: ipAddress,
                description: description
            };
        } catch (error) {
            throw new Error(`خطا در اضافه کردن IP: ${error.message}`);
        }
    }

    /**
     * Remove IP from user's whitelist
     */
    async removeIP(userId, ipAddress) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('کاربر یافت نشد');
            }

            const ipIndex = user.ipWhitelist.findIndex(item => item.ip === ipAddress);
            if (ipIndex === -1) {
                throw new Error('آدرس IP در لیست سفید یافت نشد');
            }

            // Remove IP from whitelist
            user.ipWhitelist.splice(ipIndex, 1);
            await user.save();

            // Log the action
            await AuditLog.create({
                userId: userId,
                action: 'REMOVE_IP_WHITELIST',
                resource: 'Security',
                resourceId: userId,
                details: `IP ${ipAddress} از لیست سفید حذف شد`,
                metadata: {
                    ip: ipAddress
                }
            });

            return { success: true };
        } catch (error) {
            throw new Error(`خطا در حذف IP: ${error.message}`);
        }
    }

    /**
     * Get user's IP whitelist
     */
    async getWhitelist(userId) {
        try {
            const user = await User.findById(userId).select('ipWhitelist');
            if (!user) {
                throw new Error('کاربر یافت نشد');
            }

            return user.ipWhitelist.map(item => ({
                ip: item.ip,
                description: item.description,
                addedAt: item.addedAt
            }));
        } catch (error) {
            throw new Error(`خطا در دریافت لیست IP: ${error.message}`);
        }
    }

    /**
     * Check if IP is whitelisted for user
     */
    async isIPWhitelisted(userId, ipAddress) {
        try {
            const user = await User.findById(userId).select('ipWhitelist');
            if (!user) {
                return false;
            }

            if (user.ipWhitelist.length === 0) {
                return true; // If no whitelist, allow all IPs
            }

            return user.ipWhitelist.some(item => 
                item.ip === ipAddress || this.isIPInRange(ipAddress, item.ip)
            );
        } catch (error) {
            return false;
        }
    }

    /**
     * Enable IP whitelisting for user
     */
    async enableWhitelisting(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('کاربر یافت نشد');
            }

            user.ipWhitelistEnabled = true;
            await user.save();

            // Log the action
            await AuditLog.create({
                userId: userId,
                action: 'ENABLE_IP_WHITELIST',
                resource: 'Security',
                resourceId: userId,
                details: 'لیست سفید IP فعال شد'
            });

            return { success: true };
        } catch (error) {
            throw new Error(`خطا در فعال‌سازی لیست سفید IP: ${error.message}`);
        }
    }

    /**
     * Disable IP whitelisting for user
     */
    async disableWhitelisting(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('کاربر یافت نشد');
            }

            user.ipWhitelistEnabled = false;
            await user.save();

            // Log the action
            await AuditLog.create({
                userId: userId,
                action: 'DISABLE_IP_WHITELIST',
                resource: 'Security',
                resourceId: userId,
                details: 'لیست سفید IP غیرفعال شد'
            });

            return { success: true };
        } catch (error) {
            throw new Error(`خطا در غیرفعال‌سازی لیست سفید IP: ${error.message}`);
        }
    }

    /**
     * Validate IP address format
     */
    isValidIP(ip) {
        // Check for CIDR notation
        if (ip.includes('/')) {
            const [address, prefix] = ip.split('/');
            const prefixNum = parseInt(prefix);
            
            if (isIPv4(address)) {
                return prefixNum >= 0 && prefixNum <= 32;
            } else if (isIPv6(address)) {
                return prefixNum >= 0 && prefixNum <= 128;
            }
            return false;
        }
        
        return isIPv4(ip) || isIPv6(ip);
    }

    /**
     * Check if IP is in CIDR range
     */
    isIPInRange(ip, range) {
        if (!range.includes('/')) {
            return ip === range;
        }

        const [rangeIP, prefixLength] = range.split('/');
        const prefix = parseInt(prefixLength);

        // Simple IPv4 CIDR check
        if (isIPv4(ip) && isIPv4(rangeIP)) {
            const ipNum = this.ipToNumber(ip);
            const rangeNum = this.ipToNumber(rangeIP);
            const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
            
            return (ipNum & mask) === (rangeNum & mask);
        }

        return false;
    }

    /**
     * Convert IPv4 to number
     */
    ipToNumber(ip) {
        return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
    }

    /**
     * Get IP geolocation info (mock implementation)
     */
    async getIPInfo(ip) {
        try {
            // In real implementation, use a service like MaxMind or IP-API
            return {
                ip: ip,
                country: 'Unknown',
                region: 'Unknown',
                city: 'Unknown',
                timezone: 'Unknown',
                isp: 'Unknown'
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Log suspicious IP activity
     */
    async logSuspiciousActivity(userId, ip, activity) {
        try {
            await AuditLog.create({
                userId: userId,
                action: 'SUSPICIOUS_IP_ACTIVITY',
                resource: 'Security',
                resourceId: userId,
                details: `فعالیت مشکوک از IP ${ip}: ${activity}`,
                metadata: {
                    ip: ip,
                    activity: activity,
                    timestamp: new Date()
                },
                severity: 'high'
            });
        } catch (error) {
            console.error('خطا در ثبت فعالیت مشکوک:', error);
        }
    }

    /**
     * Get recent IP activity for user
     */
    async getRecentIPActivity(userId, limit = 10) {
        try {
            const logs = await AuditLog.find({
                userId: userId,
                $or: [
                    { action: 'LOGIN' },
                    { action: 'LOGIN_FAILED' },
                    { action: 'SUSPICIOUS_IP_ACTIVITY' }
                ]
            })
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('action details metadata createdAt');

            return logs.map(log => ({
                action: log.action,
                ip: log.metadata?.ip || 'Unknown',
                details: log.details,
                timestamp: log.createdAt
            }));
        } catch (error) {
            throw new Error(`خطا در دریافت فعالیت‌های IP: ${error.message}`);
        }
    }
}

module.exports = new IPWhitelistService();
