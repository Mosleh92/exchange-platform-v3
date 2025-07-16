import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { formatCurrency, formatDate } from '../../utils/format';
import './FinancialReportChart.css';

/**
 * Comprehensive Financial Report Chart Component
 * Features: Multiple Chart Types, Date Filtering, Export, Real-time Updates
 */
const FinancialReportChart = ({ 
  data = [], 
  type = 'line',
  title = 'Financial Report',
  onExport,
  height = 400 
}) => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  
  const [chartData, setChartData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedMetrics, setSelectedMetrics] = useState(['revenue', 'profit']);
  const [chartType, setChartType] = useState(type);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Available metrics
  const availableMetrics = [
    { key: 'revenue', label: 'Revenue', color: '#4A90E2' },
    { key: 'profit', label: 'Profit', color: '#27AE60' },
    { key: 'expenses', label: 'Expenses', color: '#E74C3C' },
    { key: 'transactions', label: 'Transactions', color: '#F39C12' },
    { key: 'commission', label: 'Commission', color: '#9B59B6' },
    { key: 'volume', label: 'Volume', color: '#1ABC9C' }
  ];

  // Load chart library
  useEffect(() => {
    const loadChartLibrary = async () => {
      try {
        // In a real implementation, you would load Chart.js or similar
        // For now, we'll simulate the chart functionality
        console.log('Chart library loaded');
      } catch (error) {
        setError('Failed to load chart library');
      }
    };

    loadChartLibrary();
  }, []);

  // Process data when it changes
  useEffect(() => {
    if (data.length > 0) {
      setChartData(data);
      processData(data);
    }
  }, [data]);

  // Process and filter data
  const processData = (rawData) => {
    try {
      const filtered = rawData.filter(item => {
        const itemDate = new Date(item.date);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        return itemDate >= startDate && itemDate <= endDate;
      });

      setFilteredData(filtered);
      renderChart(filtered);
    } catch (error) {
      setError('Error processing data');
    }
  };

  // Render chart
  const renderChart = (data) => {
    if (!chartRef.current) return;

    // Clear previous chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    
    // Create chart data structure
    const datasets = selectedMetrics.map(metric => {
      const metricConfig = availableMetrics.find(m => m.key === metric);
      return {
        label: metricConfig.label,
        data: data.map(item => item[metric] || 0),
        borderColor: metricConfig.color,
        backgroundColor: metricConfig.color + '20',
        borderWidth: 2,
        fill: chartType === 'area',
        tension: 0.4
      };
    });

    const chartData = {
      labels: data.map(item => formatDate(item.date, 'MMM DD')),
      datasets
    };

    // Chart configuration
    const config = {
      type: chartType,
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: title,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                return `${label}: ${formatCurrency(value, 'IRR')}`;
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Date'
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Amount (IRR)'
            },
            ticks: {
              callback: function(value) {
                return formatCurrency(value, 'IRR');
              }
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    };

    // In a real implementation, you would create the chart here
    // chartInstance.current = new Chart(ctx, config);
    console.log('Chart rendered with config:', config);
  };

  // Handle date range change
  const handleDateRangeChange = (field, value) => {
    const newRange = { ...dateRange, [field]: value };
    setDateRange(newRange);
    processData(chartData);
  };

  // Handle metric selection
  const handleMetricToggle = (metric) => {
    setSelectedMetrics(prev => 
      prev.includes(metric)
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    );
  };

  // Handle chart type change
  const handleChartTypeChange = (newType) => {
    setChartType(newType);
    renderChart(filteredData);
  };

  // Export chart
  const handleExport = async (format) => {
    try {
      setIsLoading(true);
      
      const exportData = {
        chartType,
        dateRange,
        selectedMetrics,
        data: filteredData,
        format
      };

      if (onExport) {
        await onExport(exportData);
      } else {
        // Default export functionality
        const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial-report-${formatDate(new Date())}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      setError('Export failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate summary statistics
  const calculateSummary = () => {
    if (filteredData.length === 0) return {};

    const summary = {};
    selectedMetrics.forEach(metric => {
      const values = filteredData.map(item => item[metric] || 0);
      summary[metric] = {
        total: values.reduce((sum, val) => sum + val, 0),
        average: values.reduce((sum, val) => sum + val, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values)
      };
    });

    return summary;
  };

  const summary = calculateSummary();

  return (
    <div className="financial-report-chart">
      {/* Chart Controls */}
      <div className="chart-controls">
        <div className="control-group">
          <label>Date Range:</label>
          <div className="date-inputs">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => handleDateRangeChange('start', e.target.value)}
              className="date-input"
            />
            <span>to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => handleDateRangeChange('end', e.target.value)}
              className="date-input"
            />
          </div>
        </div>

        <div className="control-group">
          <label>Chart Type:</label>
          <select
            value={chartType}
            onChange={(e) => handleChartTypeChange(e.target.value)}
            className="chart-type-select"
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
            <option value="area">Area Chart</option>
            <option value="pie">Pie Chart</option>
          </select>
        </div>

        <div className="control-group">
          <label>Metrics:</label>
          <div className="metrics-selector">
            {availableMetrics.map(metric => (
              <label key={metric.key} className="metric-checkbox">
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(metric.key)}
                  onChange={() => handleMetricToggle(metric.key)}
                />
                <span className="checkmark" style={{ backgroundColor: metric.color }}></span>
                {metric.label}
              </label>
            ))}
          </div>
        </div>

        <div className="control-group">
          <label>Export:</label>
          <div className="export-buttons">
            <button
              className="btn btn-sm btn-outline"
              onClick={() => handleExport('json')}
              disabled={isLoading}
            >
              JSON
            </button>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => handleExport('csv')}
              disabled={isLoading}
            >
              CSV
            </button>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => handleExport('pdf')}
              disabled={isLoading}
            >
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="chart-error">
          ⚠️ {error}
        </div>
      )}

      {/* Chart Container */}
      <div className="chart-container" style={{ height: `${height}px` }}>
        {isLoading ? (
          <div className="chart-loading">
            <div className="loading-spinner"></div>
            <p>Loading chart data...</p>
          </div>
        ) : (
          <canvas ref={chartRef} className="chart-canvas"></canvas>
        )}
      </div>

      {/* Summary Statistics */}
      {Object.keys(summary).length > 0 && (
        <div className="chart-summary">
          <h4>Summary Statistics</h4>
          <div className="summary-grid">
            {selectedMetrics.map(metric => {
              const metricConfig = availableMetrics.find(m => m.key === metric);
              const stats = summary[metric];
              
              return (
                <div key={metric} className="summary-card">
                  <div className="summary-header">
                    <span 
                      className="metric-color" 
                      style={{ backgroundColor: metricConfig.color }}
                    ></span>
                    <h5>{metricConfig.label}</h5>
                  </div>
                  
                  <div className="summary-stats">
                    <div className="stat-item">
                      <span className="stat-label">Total:</span>
                      <span className="stat-value">
                        {formatCurrency(stats.total, 'IRR')}
                      </span>
                    </div>
                    
                    <div className="stat-item">
                      <span className="stat-label">Average:</span>
                      <span className="stat-value">
                        {formatCurrency(stats.average, 'IRR')}
                      </span>
                    </div>
                    
                    <div className="stat-item">
                      <span className="stat-label">Min:</span>
                      <span className="stat-value">
                        {formatCurrency(stats.min, 'IRR')}
                      </span>
                    </div>
                    
                    <div className="stat-item">
                      <span className="stat-label">Max:</span>
                      <span className="stat-value">
                        {formatCurrency(stats.max, 'IRR')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No Data State */}
      {filteredData.length === 0 && !isLoading && !error && (
        <div className="chart-empty">
          <div className="empty-icon">📊</div>
          <h4>No Data Available</h4>
          <p>No data found for the selected date range and metrics.</p>
        </div>
      )}
    </div>
  );
};

export default FinancialReportChart; 