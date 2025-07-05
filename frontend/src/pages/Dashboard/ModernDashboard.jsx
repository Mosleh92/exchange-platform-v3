import React from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';

const kpiCards = [
  { label: 'موجودی کل', value: '۲,۵۰۰,۰۰۰,۰۰۰ ریال', icon: '💰', color: 'bg-primary text-white' },
  { label: 'تراکنش‌های امروز', value: '۱,۲۳۰', icon: '🔄', color: 'bg-success text-white' },
  { label: 'مشتریان فعال', value: '۳۴۵', icon: '👤', color: 'bg-secondary text-white' },
];

const chartData = {
  labels: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور'],
  values: [120, 200, 150, 300, 250, 400],
};

const columns = [
  { title: 'نوع', accessor: 'type' },
  { title: 'مبلغ', accessor: 'amount' },
  { title: 'ارز', accessor: 'currency' },
  { title: 'تاریخ', accessor: 'date' },
  { title: 'وضعیت', accessor: 'status' },
];

const data = [
  { type: 'خرید ارز', amount: '۵۰,۰۰۰,۰۰۰', currency: 'ریال', date: '۱۴۰۳/۰۴/۰۱', status: 'تکمیل شده' },
  { type: 'فروش ارز', amount: '۲۵,۰۰۰', currency: 'دلار', date: '۱۴۰۳/۰۴/۰۱', status: 'در انتظار' },
  { type: 'واریز', amount: '۱۰۰,۰۰۰,۰۰۰', currency: 'ریال', date: '۱۴۰۳/۰۳/۳۱', status: 'تکمیل شده' },
  { type: 'برداشت', amount: '۱۰,۰۰۰', currency: 'دلار', date: '۱۴۰۳/۰۳/۳۰', status: 'لغو شده' },
];

export default function ModernDashboard() {
  return (
    <div className="container mx-auto p-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {kpiCards.map((kpi, i) => (
          <div key={i} className={`rounded-2xl shadow-md p-6 flex items-center gap-4 ${kpi.color} dark:bg-opacity-80`}>
            <span className="text-3xl">{kpi.icon}</span>
            <div>
              <div className="text-lg font-bold">{kpi.value}</div>
              <div className="text-sm opacity-80">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-bold">حجم تراکنش ماهانه</div>
          <Button variant="ghost" size="sm">گزارش کامل</Button>
        </div>
        <BarChart
          xAxis={[{ scaleType: 'band', data: chartData.labels }]}
          series={[{ data: chartData.values }]}
          height={220}
          colors={["#6366f1"]}
        />
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-bold">تراکنش‌های اخیر</div>
          <Button variant="primary" size="sm">مشاهده همه</Button>
        </div>
        <Table columns={columns} data={data} />
      </div>
    </div>
  );
} 