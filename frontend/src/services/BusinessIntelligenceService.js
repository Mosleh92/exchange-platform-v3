// Business Intelligence Service - Data Layer for BI Dashboard
import api from './api';

class BusinessIntelligenceService {
  // Dashboard Analytics
  async getDashboardAnalytics(params) {
    try {
      const { tenantId, dateRange } = params;
      const response = await api.get('/analytics/overview', {
        params: {
          tenant_id: tenantId,
          date_range: dateRange
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      // Return mock data for development
      return this.getMockDashboardData();
    }
  }

  // Revenue Analytics
  async getRevenueAnalytics(params) {
    try {
      const response = await api.get('/analytics/revenue', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
      return this.getMockRevenueData();
    }
  }

  // Customer Analytics
  async getCustomerAnalytics(params) {
    try {
      const response = await api.get('/analytics/customers', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching customer analytics:', error);
      return this.getMockCustomerData();
    }
  }

  // Transaction Analytics
  async getTransactionAnalytics(params) {
    try {
      const response = await api.get('/analytics/transactions', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching transaction analytics:', error);
      return this.getMockTransactionData();
    }
  }

  // Performance Metrics
  async getPerformanceMetrics(params) {
    try {
      const response = await api.get('/analytics/performance', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      return this.getMockPerformanceData();
    }
  }

  // Generate Custom Report
  async generateCustomReport(config) {
    try {
      const response = await api.post('/reports/generate', config);
      return response.data;
    } catch (error) {
      console.error('Error generating custom report:', error);
      throw error;
    }
  }

  // Export Report
  async exportReport(reportId, format) {
    try {
      const response = await api.get(`/reports/export/${reportId}`, {
        params: { format },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting report:', error);
      throw error;
    }
  }

  // Get Saved Reports
  async getSavedReports(tenantId) {
    try {
      const response = await api.get('/reports/saved', {
        params: { tenant_id: tenantId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching saved reports:', error);
      return [];
    }
  }

  // Real-time Data Updates
  async getRealtimeUpdates(tenantId) {
    try {
      const response = await api.get('/analytics/realtime', {
        params: { tenant_id: tenantId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching realtime updates:', error);
      return null;
    }
  }

  // Predictive Analytics
  async getPredictiveAnalytics(params) {
    try {
      const response = await api.get('/analytics/predictive', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching predictive analytics:', error);
      return this.getMockPredictiveData();
    }
  }

  // Risk Assessment
  async getRiskAssessment(tenantId) {
    try {
      const response = await api.get('/analytics/risk', {
        params: { tenant_id: tenantId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching risk assessment:', error);
      return this.getMockRiskData();
    }
  }

  // Mock Data Methods (for development/testing)
  getMockDashboardData() {
    return {
      metrics: {
        totalRevenue: 12500000,
        dailyTransactions: 87,
        activeUsers: 234,
        weeklyGrowth: 15.3,
        conversionRate: 4.7,
        avgTransactionValue: 2850000
      },
      analytics: {
        revenueData: [
          { date: '۱۴۰۳/۰۹/۰۱', revenue: 125000, transactions: 45 },
          { date: '۱۴۰۳/۰۹/۰۲', revenue: 135000, transactions: 52 },
          { date: '۱۴۰۳/۰۹/۰۳', revenue: 142000, transactions: 48 },
          { date: '۱۴۰۳/۰۹/۰۴', revenue: 128000, transactions: 41 },
          { date: '۱۴۰۳/۰۹/۰۵', revenue: 156000, transactions: 63 },
          { date: '۱۴۰۳/۰۹/۰۶', revenue: 149000, transactions: 57 },
          { date: '۱۴۰۳/۰۹/۰۷', revenue: 165000, transactions: 68 }
        ],
        performanceData: [
          { time: '00:00', responseTime: 120, throughput: 850, errors: 2 },
          { time: '04:00', responseTime: 95, throughput: 620, errors: 1 },
          { time: '08:00', responseTime: 180, throughput: 1200, errors: 5 },
          { time: '12:00', responseTime: 145, throughput: 1450, errors: 3 },
          { time: '16:00', responseTime: 165, throughput: 1380, errors: 4 },
          { time: '20:00', responseTime: 135, throughput: 980, errors: 2 }
        ]
      },
      reports: {
        recent: [
          { id: 1, name: 'گزارش درآمد ماهانه', date: '۱۴۰۳/۰۹/۰۷', status: 'completed' },
          { id: 2, name: 'تحلیل رفتار مشتریان', date: '۱۴۰۳/۰۹/۰۶', status: 'pending' }
        ]
      }
    };
  }

  getMockRevenueData() {
    return {
      totalRevenue: 12500000,
      growth: 15.3,
      forecast: [
        { month: 'دی', actual: 8500000, predicted: 8200000 },
        { month: 'بهمن', actual: 9200000, predicted: 9000000 },
        { month: 'اسفند', actual: 12500000, predicted: 12800000 }
      ],
      breakdown: {
        commissions: 3500000,
        fees: 2100000,
        premiums: 6900000
      }
    };
  }

  getMockCustomerData() {
    return {
      totalCustomers: 2456,
      activeCustomers: 1834,
      newCustomers: 156,
      customerLifetimeValue: 18500000,
      segments: [
        { name: 'کاربران جدید', count: 856, value: 35 },
        { name: 'کاربران فعال', count: 1108, value: 45 },
        { name: 'کاربران VIP', count: 492, value: 20 }
      ],
      behavior: {
        avgSessionDuration: 245,
        bounceRate: 23.5,
        retentionRate: 78.2
      }
    };
  }

  getMockTransactionData() {
    return {
      totalTransactions: 8745,
      successfulTransactions: 8567,
      failedTransactions: 178,
      avgProcessingTime: 1.8,
      volume: {
        daily: 87,
        weekly: 612,
        monthly: 2456
      },
      types: [
        { type: 'خرید ارز', count: 3245, percentage: 37.1 },
        { type: 'فروش ارز', count: 2987, percentage: 34.2 },
        { type: 'حواله', count: 1654, percentage: 18.9 },
        { type: 'واریز', count: 859, percentage: 9.8 }
      ]
    };
  }

  getMockPerformanceData() {
    return {
      systemHealth: 96.5,
      uptime: 99.8,
      avgResponseTime: 135,
      throughput: 1120,
      errorRate: 0.23,
      resources: {
        cpu: 45.2,
        memory: 67.8,
        disk: 34.1,
        network: 52.3
      }
    };
  }

  getMockPredictiveData() {
    return {
      revenueForecast: {
        nextWeek: 1850000,
        nextMonth: 15600000,
        confidence: 87.5
      },
      customerGrowth: {
        nextWeek: 45,
        nextMonth: 178,
        confidence: 82.1
      },
      trends: [
        { metric: 'درآمد', trend: 'increasing', confidence: 89.2 },
        { metric: 'کاربران', trend: 'stable', confidence: 76.8 },
        { metric: 'تراکنش‌ها', trend: 'increasing', confidence: 91.5 }
      ]
    };
  }

  getMockRiskData() {
    return {
      overallRisk: 'low',
      riskScore: 23.5,
      categories: [
        { name: 'امنیت تراکنش', score: 95, risk: 'low' },
        { name: 'کیفیت داده', score: 88, risk: 'medium' },
        { name: 'عملکرد سیستم', score: 92, risk: 'low' },
        { name: 'رضایت مشتری', score: 86, risk: 'medium' },
        { name: 'پایداری مالی', score: 91, risk: 'low' },
        { name: 'انطباق قوانین', score: 97, risk: 'low' }
      ],
      alerts: [
        { type: 'warning', message: 'افزایش زمان پاسخ در ساعات پیک' },
        { type: 'info', message: 'بروزرسانی سیستم در ۲۴ ساعت آینده' }
      ]
    };
  }

  // Utility methods
  formatCurrency(value) {
    return new Intl.NumberFormat('fa-IR').format(value);
  }

  formatPercentage(value, decimals = 1) {
    return `${value.toFixed(decimals)}%`;
  }

  formatDate(date) {
    // Convert to Jalaali date format
    return new Intl.DateTimeFormat('fa-IR').format(new Date(date));
  }

  // Export functionality
  async downloadReport(data, filename, format) {
    try {
      let blob;
      let mimeType;

      switch (format) {
        case 'csv':
          blob = new Blob([this.convertToCSV(data)], { type: 'text/csv' });
          mimeType = 'text/csv';
          filename = `${filename}.csv`;
          break;
        case 'json':
          blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          mimeType = 'application/json';
          filename = `${filename}.json`;
          break;
        default:
          throw new Error('Unsupported format');
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      throw error;
    }
  }

  convertToCSV(data) {
    if (!Array.isArray(data) || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  }
}

// Export singleton instance
const biService = new BusinessIntelligenceService();
export default biService;