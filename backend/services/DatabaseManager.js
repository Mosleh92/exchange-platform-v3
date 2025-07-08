// backend/services/DatabaseManager.js
class DatabaseManager {
  constructor() {
    this.masterDB = null; // اتصال به master database
    this.tenantConnections = new Map(); // کش اتصالات tenant ها
  }

  // ایجاد دیتابیس جدید برای صرافی
  async createTenantDatabase(exchangeData) {
    try {
      const tenantId = this.generateTenantId(exchangeData);
      const dbName = `exchange_${tenantId}`;

      console.log(`🗄️ Creating database for: ${exchangeData.businessName}`);

      // 1. ایجاد دیتابیس جدید
      await this.masterDB.query(`CREATE DATABASE ${dbName}`);

      // 2. ایجاد user مختص این دیتابیس
      const dbUser = `user_${tenantId}`;
      const dbPassword = this.generateSecurePassword();

      await this.masterDB.query(`
                CREATE USER '${dbUser}'@'%' IDENTIFIED BY '${dbPassword}';
                GRANT ALL PRIVILEGES ON ${dbName}.* TO '${dbUser}'@'%';
                FLUSH PRIVILEGES;
            `);

      // 3. اتصال به دیتابیس جدید و ایجاد جداول
      const tenantDB = await this.connectToTenantDB(dbName, dbUser, dbPassword);
      await this.createTenantTables(tenantDB, exchangeData);

      // 4. ذخیره اطلاعات tenant در master database
      await this.registerTenant({
        tenantId,
        dbName,
        dbUser,
        dbPassword: this.encrypt(dbPassword),
        exchangeData,
        createdAt: new Date(),
      });

      console.log(`✅ Database created successfully: ${dbName}`);

      return {
        tenantId,
        dbName,
        dbUser,
        dbPassword,
        connectionString: this.buildConnectionString(
          dbName,
          dbUser,
          dbPassword,
        ),
      };
    } catch (error) {
      console.error("❌ Database creation failed:", error);
      throw error;
    }
  }

  // ایجاد جداول مختص هر صرافی
  async createTenantTables(tenantDB, exchangeData) {
    const tables = [
      // جدول فروع
      `CREATE TABLE branches (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                country VARCHAR(100),
                city VARCHAR(100),
                address TEXT,
                phone VARCHAR(50),
                email VARCHAR(100),
                manager_id VARCHAR(50),
                is_main BOOLEAN DEFAULT FALSE,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

      // جدول کارمندان
      `CREATE TABLE staff (
                id VARCHAR(50) PRIMARY KEY,
                branch_id VARCHAR(50),
                name VARCHAR(200) NOT NULL,
                email VARCHAR(100) UNIQUE,
                phone VARCHAR(50),
                role ENUM('manager', 'staff', 'cashier') DEFAULT 'staff',
                username VARCHAR(100) UNIQUE,
                password_hash VARCHAR(255),
                permissions JSON,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (branch_id) REFERENCES branches(id)
            )`,

      // جدول مشتریان
      `CREATE TABLE customers (
                id VARCHAR(50) PRIMARY KEY,
                branch_id VARCHAR(50),
                name VARCHAR(200) NOT NULL,
                email VARCHAR(100),
                phone VARCHAR(50),
                national_id VARCHAR(50),
                address TEXT,
                kyc_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
                status ENUM('active', 'blocked') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (branch_id) REFERENCES branches(id)
            )`,

      // جدول تراکنش‌ها
      `CREATE TABLE transactions (
                id VARCHAR(50) PRIMARY KEY,
                branch_id VARCHAR(50),
                customer_id VARCHAR(50),
                staff_id VARCHAR(50),
                type ENUM('send', 'receive', 'exchange') NOT NULL,
                from_currency VARCHAR(10),
                to_currency VARCHAR(10),
                amount DECIMAL(15,2),
                exchange_rate DECIMAL(10,6),
                fee DECIMAL(10,2),
                total_amount DECIMAL(15,2),
                status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (branch_id) REFERENCES branches(id),
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                FOREIGN KEY (staff_id) REFERENCES staff(id)
            )`,

      // جدول تنظیمات صرافی
      `CREATE TABLE exchange_settings (
                id INT PRIMARY KEY AUTO_INCREMENT,
                setting_key VARCHAR(100) UNIQUE,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )`,
    ];

    for (const tableSQL of tables) {
      await tenantDB.query(tableSQL);
    }

    // درج داده‌های اولیه
    await this.insertInitialData(tenantDB, exchangeData);
  }

  // تولید ID یکتا برای tenant
  generateTenantId(exchangeData) {
    const countryCode = exchangeData.businessCountry.toLowerCase();
    const cityCode = exchangeData.businessCity.toLowerCase().substring(0, 3);
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5);

    return `${countryCode}${cityCode}${timestamp}${random}`;
  }

  // تولید رمز عبور امن
  generateSecurePassword(length = 16) {
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}
