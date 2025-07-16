import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../UI/Card';
import { Button } from '../UI/Button';
import { Select } from '../UI/Select';
import { Badge } from '../UI/Badge';
import { Progress } from '../UI/Progress';
import { api } from '../../services/api';

const FinancialDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    fetchDashboardMetrics();
  }, [period]);

  const fetchDashboardMetrics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/dashboard/financial?period=${period}`);
      setMetrics(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard metrics');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(2)}%`;
  };

  const getTrendIcon = (trend) => {
    return trend === 'UP' ? '↗️' : '↘️';
  };

  const getTrendColor = (trend) => {
    return trend === 'UP' ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchDashboardMetrics}>Retry</Button>
      </div>
    );
  }

  if (!metrics) {
    return <div>No data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
          <p className="text-gray-600">Comprehensive financial overview and analytics</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-32"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </Select>
          <Button onClick={fetchDashboardMetrics} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <span className={`text-lg ${getTrendColor(metrics.summary.volumeTrend)}`}>
              {getTrendIcon(metrics.summary.volumeTrend)}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.summary.totalVolume)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.summary.totalTransactions} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <span className={`text-lg ${getTrendColor(metrics.summary.revenueTrend)}`}>
              {getTrendIcon(metrics.summary.revenueTrend)}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.summary.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(metrics.summary.profitMargin)} profit margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Badge variant="secondary">Live</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.summary.activeUsers.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              Average daily active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
            <Badge variant="outline">Size</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.summary.averageTransactionSize)}</div>
            <p className="text-xs text-muted-foreground">
              Per transaction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Trading Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={metrics.volumeMetrics.dailyVolume}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Area type="monotone" dataKey="volume" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.revenueMetrics.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="fees" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Total Return</span>
                <span className="font-semibold">{formatPercentage(metrics.performanceMetrics.totalReturn)}</span>
              </div>
              <Progress value={Math.abs(metrics.performanceMetrics.totalReturn)} className="w-full" />
              
              <div className="flex justify-between items-center">
                <span>Sharpe Ratio</span>
                <span className="font-semibold">{metrics.performanceMetrics.sharpeRatio.toFixed(2)}</span>
              </div>
              <Progress value={Math.min(metrics.performanceMetrics.sharpeRatio * 20, 100)} className="w-full" />
              
              <div className="flex justify-between items-center">
                <span>Win Rate</span>
                <span className="font-semibold">{formatPercentage(metrics.performanceMetrics.winRate * 100)}</span>
              </div>
              <Progress value={metrics.performanceMetrics.winRate * 100} className="w-full" />
            </div>
          </CardContent>
        </Card>

        {/* Risk Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>VaR (95%)</span>
                <span className="font-semibold">{formatPercentage(Math.abs(metrics.riskMetrics.var95))}</span>
              </div>
              <Progress value={Math.abs(metrics.riskMetrics.var95) * 10} className="w-full" />
              
              <div className="flex justify-between items-center">
                <span>Max Drawdown</span>
                <span className="font-semibold">{formatPercentage(metrics.riskMetrics.maxDrawdown * 100)}</span>
              </div>
              <Progress value={metrics.riskMetrics.maxDrawdown * 100} className="w-full" />
              
              <div className="flex justify-between items-center">
                <span>Volatility</span>
                <span className="font-semibold">{formatPercentage(metrics.riskMetrics.volatility * 100)}</span>
              </div>
              <Progress value={metrics.riskMetrics.volatility * 100} className="w-full" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Assets */}
        <Card>
          <CardHeader>
            <CardTitle>Top Trading Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics.volumeMetrics.topAssets}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ asset, percent }) => `${asset} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="volume"
                >
                  {metrics.volumeMetrics.topAssets.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Transaction Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.transactionMetrics.dailyTransactions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>User Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Active Days</span>
              <span className="font-semibold">{metrics.userMetrics.activeDays}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Sessions</span>
              <span className="font-semibold">{metrics.userMetrics.totalSessions}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Session Duration</span>
              <span className="font-semibold">{metrics.userMetrics.sessionDuration.toFixed(1)} min</span>
            </div>
            <div className="flex justify-between">
              <span>User Retention</span>
              <span className="font-semibold">{formatPercentage(metrics.userMetrics.userRetention * 100)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Total Transactions</span>
              <span className="font-semibold">{metrics.transactionMetrics.totalTransactions}</span>
            </div>
            <div className="flex justify-between">
              <span>Success Rate</span>
              <span className="font-semibold">
                {formatPercentage(metrics.transactionMetrics.successRate[metrics.transactionMetrics.successRate.length - 1]?.rate || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Avg Transaction Time</span>
              <span className="font-semibold">{(metrics.transactionMetrics.averageTransactionTime / 1000 / 60).toFixed(1)} min</span>
            </div>
            <div className="flex justify-between">
              <span>Transaction Types</span>
              <span className="font-semibold">{Object.keys(metrics.transactionMetrics.transactionTypes).length}</span>
            </div>
          </CardContent>
        </Card>

        {/* Benchmark Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Benchmark Comparison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.performanceMetrics.benchmarkComparison && Object.entries(metrics.performanceMetrics.benchmarkComparison).map(([benchmark, data]) => (
              <div key={benchmark} className="flex justify-between items-center">
                <span className="capitalize">{benchmark}</span>
                <div className="text-right">
                  <div className="font-semibold">{formatPercentage(data.outperformance * 100)}</div>
                  <div className="text-xs text-gray-500">Corr: {data.correlation.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancialDashboard; 