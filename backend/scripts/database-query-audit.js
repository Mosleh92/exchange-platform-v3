/**
 * Database Query Audit Script
 * بررسی جامع Queryهای دیتابیس برای اطمینان از:
 * 1. استفاده از tenant_id در تمام Queryها
 * 2. بهینه‌سازی Queryها (Indexing, Caching)
 * 3. عدم وجود Full Table Scan بدون فیلتر Tenant
 */

const fs = require("fs");
const path = require("path");
const glob = require("glob");

// Patterns to search for
const PATTERNS = {
  // Database queries without tenant filtering
  FULL_TABLE_SCAN: [
    /\.find\(\s*\{\s*\}\s*\)/g,
    /\.findOne\(\s*\{\s*\}\s*\)/g,
    /\.aggregate\(\s*\{\s*\}\s*\)/g,
    /\.update\(\s*\{\s*\}\s*\)/g,
    /\.delete\(\s*\{\s*\}\s*\)/g,
    /\.deleteMany\(\s*\{\s*\}\s*\)/g,
    /\.updateMany\(\s*\{\s*\}\s*\)/g,
  ],

  // Database queries that should include tenant_id
  QUERIES_WITHOUT_TENANT: [
    /\.find\(\s*\{[^}]*\}\s*\)/g,
    /\.findOne\(\s*\{[^}]*\}\s*\)/g,
    /\.aggregate\(\s*\[[^\]]*\]\s*\)/g,
  ],

  // Potential security issues
  SECURITY_ISSUES: [
    /\.findById\(\s*[^)]+\)/g,
    /\.findByIdAndUpdate\(\s*[^)]+\)/g,
    /\.findByIdAndDelete\(\s*[^)]+\)/g,
  ],
};

// Files to exclude from audit
const EXCLUDE_PATTERNS = [
  "**/node_modules/**",
  "**/tests/**",
  "**/*.test.js",
  "**/*.spec.js",
  "**/scripts/database-query-audit.js",
];

// Models that should have tenant_id
const TENANT_MODELS = [
  "Transaction",
  "Customer",
  "User",
  "Payment",
  "Remittance",
  "P2POrder",
  "Account",
  "BankAccount",
  "Invoice",
  "Receipt",
  "Document",
  "AuditLog",
  "Notification",
  "Subscription",
  "SalesPlan",
  "Plan",
  "TenantSettings",
  "ExchangeRate",
  "CryptoOrder",
  "CryptoTransaction",
  "CurrencyTransaction",
  "InterBranchTransfer",
  "Debt",
  "Discrepancy",
  "JournalEntry",
];

class DatabaseQueryAuditor {
  constructor() {
    this.issues = [];
    this.stats = {
      filesScanned: 0,
      issuesFound: 0,
      criticalIssues: 0,
      securityIssues: 0,
      performanceIssues: 0,
    };
  }

  async scanFiles() {
    const files = glob.sync("**/*.js", {
      ignore: EXCLUDE_PATTERNS,
      cwd: path.join(__dirname, "..", "src"),
    });

    console.log(
      `🔍 Scanning ${files.length} files for database query issues...\n`,
    );

    for (const file of files) {
      await this.auditFile(file);
    }
  }

  async auditFile(filePath) {
    const fullPath = path.join(__dirname, "..", "src", filePath);
    const content = fs.readFileSync(fullPath, "utf8");
    const lines = content.split("\n");

    this.stats.filesScanned++;

    // Check for full table scans
    this.checkFullTableScans(filePath, content, lines);

    // Check for queries without tenant filtering
    this.checkQueriesWithoutTenant(filePath, content, lines);

    // Check for security issues
    this.checkSecurityIssues(filePath, content, lines);

    // Check for missing indexes
    this.checkMissingIndexes(filePath, content, lines);
  }

  checkFullTableScans(filePath, content, lines) {
    PATTERNS.FULL_TABLE_SCAN.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          const lineNumber = this.findLineNumber(content, match);
          this.issues.push({
            type: "CRITICAL",
            category: "Full Table Scan",
            file: filePath,
            line: lineNumber,
            issue: `Full table scan detected: ${match.trim()}`,
            recommendation:
              "Add tenant_id filter to prevent data leakage across tenants",
          });
          this.stats.criticalIssues++;
        });
      }
    });
  }

  checkQueriesWithoutTenant(filePath, content, lines) {
    PATTERNS.QUERIES_WITHOUT_TENANT.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          // Check if this query includes tenant_id
          if (!match.includes("tenant_id") && !match.includes("tenantId")) {
            const lineNumber = this.findLineNumber(content, match);
            this.issues.push({
              type: "SECURITY",
              category: "Missing Tenant Filter",
              file: filePath,
              line: lineNumber,
              issue: `Query without tenant filtering: ${match.trim()}`,
              recommendation: "Add tenant_id or tenantId to query filter",
            });
            this.stats.securityIssues++;
          }
        });
      }
    });
  }

  checkSecurityIssues(filePath, content, lines) {
    PATTERNS.SECURITY_ISSUES.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          const lineNumber = this.findLineNumber(content, match);
          this.issues.push({
            type: "SECURITY",
            category: "Potential Security Issue",
            file: filePath,
            line: lineNumber,
            issue: `Direct ID access without tenant filtering: ${match.trim()}`,
            recommendation:
              "Use findOne with tenant_id filter instead of findById",
          });
          this.stats.securityIssues++;
        });
      }
    });
  }

  checkMissingIndexes(filePath, content, lines) {
    // Check if models have proper indexes
    if (filePath.includes("models/")) {
      const modelName = path.basename(filePath, ".js");
      if (TENANT_MODELS.includes(modelName)) {
        if (
          !content.includes(".index({ tenant_id: 1 })") &&
          !content.includes(".index({ tenantId: 1 })")
        ) {
          this.issues.push({
            type: "PERFORMANCE",
            category: "Missing Index",
            file: filePath,
            line: 1,
            issue: `Model ${modelName} missing tenant_id index`,
            recommendation:
              "Add index on tenant_id field for better query performance",
          });
          this.stats.performanceIssues++;
        }
      }
    }
  }

  findLineNumber(content, match) {
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(match.trim())) {
        return i + 1;
      }
    }
    return 0;
  }

  generateReport() {
    console.log("📊 DATABASE QUERY AUDIT REPORT");
    console.log("================================\n");

    console.log("📈 STATISTICS:");
    console.log(`   Files scanned: ${this.stats.filesScanned}`);
    console.log(`   Total issues found: ${this.issues.length}`);
    console.log(`   Critical issues: ${this.stats.criticalIssues}`);
    console.log(`   Security issues: ${this.stats.securityIssues}`);
    console.log(`   Performance issues: ${this.stats.performanceIssues}\n`);

    if (this.issues.length === 0) {
      console.log(
        "✅ No issues found! All database queries are properly secured and optimized.",
      );
      return;
    }

    // Group issues by type
    const criticalIssues = this.issues.filter((i) => i.type === "CRITICAL");
    const securityIssues = this.issues.filter((i) => i.type === "SECURITY");
    const performanceIssues = this.issues.filter(
      (i) => i.type === "PERFORMANCE",
    );

    if (criticalIssues.length > 0) {
      console.log("🚨 CRITICAL ISSUES (Full Table Scans):");
      console.log("=====================================");
      criticalIssues.forEach((issue) => {
        console.log(`   File: ${issue.file}:${issue.line}`);
        console.log(`   Issue: ${issue.issue}`);
        console.log(`   Recommendation: ${issue.recommendation}\n`);
      });
    }

    if (securityIssues.length > 0) {
      console.log("🔒 SECURITY ISSUES (Missing Tenant Filters):");
      console.log("===========================================");
      securityIssues.forEach((issue) => {
        console.log(`   File: ${issue.file}:${issue.line}`);
        console.log(`   Issue: ${issue.issue}`);
        console.log(`   Recommendation: ${issue.recommendation}\n`);
      });
    }

    if (performanceIssues.length > 0) {
      console.log("⚡ PERFORMANCE ISSUES (Missing Indexes):");
      console.log("=======================================");
      performanceIssues.forEach((issue) => {
        console.log(`   File: ${issue.file}:${issue.line}`);
        console.log(`   Issue: ${issue.issue}`);
        console.log(`   Recommendation: ${issue.recommendation}\n`);
      });
    }

    // Generate recommendations
    console.log("💡 GENERAL RECOMMENDATIONS:");
    console.log("============================");
    console.log(
      "1. Always include tenant_id in WHERE clauses for multi-tenant data",
    );
    console.log(
      "2. Use compound indexes on (tenant_id, other_fields) for better performance",
    );
    console.log(
      "3. Avoid findById() - use findOne({ _id: id, tenant_id: tenantId }) instead",
    );
    console.log(
      "4. Implement query middleware to automatically add tenant filters",
    );
    console.log("5. Use database connection pooling for better performance");
    console.log(
      "6. Consider implementing row-level security at the database level",
    );
    console.log(
      "7. Regular audit of database queries for security compliance\n",
    );

    // Save detailed report to file
    const reportPath = path.join(__dirname, "database-audit-report.json");
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          stats: this.stats,
          issues: this.issues,
        },
        null,
        2,
      ),
    );

    console.log(`📄 Detailed report saved to: ${reportPath}`);
  }
}

// Run the audit
async function main() {
  const auditor = new DatabaseQueryAuditor();
  await auditor.scanFiles();
  auditor.generateReport();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DatabaseQueryAuditor;
