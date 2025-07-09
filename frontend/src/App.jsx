import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { 
  Home, 
  BarChart3, 
  Shield, 
  Users, 
  Zap, 
  Building, 
  Smartphone,
  TrendingUp,
  DollarSign,
  Activity,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react'

// Components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
)

const FeatureCard = ({ icon: Icon, title, description, color = "primary" }) => (
  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
    <div className={`w-12 h-12 bg-${color}-100 rounded-full flex items-center justify-center mb-4`}>
      <Icon className={`w-6 h-6 text-${color}-600`} />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 leading-relaxed">{description}</p>
  </div>
)

const StatCard = ({ icon: Icon, title, value, change, color = "primary" }) => (
  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {change && (
          <p className={`text-sm ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'} flex items-center`}>
            <TrendingUp className="w-4 h-4 mr-1" />
            {change}
          </p>
        )}
      </div>
      <div className={`p-3 bg-${color}-100 rounded-full`}>
        <Icon className={`w-6 h-6 text-${color}-600`} />
      </div>
    </div>
  </div>
)

// Pages
const HomePage = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/status')
      const data = await response.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      toast.error('Failed to fetch stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Exchange Platform V3</h1>
                <p className="text-sm text-gray-600">Multi-tenant Trading Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/login"
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Next-Generation
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {' '}Exchange Platform
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            A comprehensive multi-tenant exchange platform built with modern technologies. 
            Secure, scalable, and feature-rich trading solution for the future of finance.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? <LoadingSpinner /> : 'Get Started'}
            </button>
            <button className="px-8 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Learn More
            </button>
          </div>

          {/* Status Indicators */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <div className="flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full">
              <CheckCircle className="w-4 h-4 mr-2" />
              System Online
            </div>
            <div className="flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full">
              <Activity className="w-4 h-4 mr-2" />
              Real-time Trading
            </div>
            <div className="flex items-center px-4 py-2 bg-purple-100 text-purple-800 rounded-full">
              <Shield className="w-4 h-4 mr-2" />
              Secure Platform
            </div>
          </div>
        </section>

        {/* Stats Section */}
        {stats && (
          <section className="mb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={Users}
                title="Total Users"
                value={stats.totalUsers.toLocaleString()}
                change="+12%"
                color="primary"
              />
              <StatCard
                icon={TrendingUp}
                title="Total Trades"
                value={stats.totalTrades.toLocaleString()}
                change="+8%"
                color="success"
              />
              <StatCard
                icon={DollarSign}
                title="System Status"
                value={stats.systemStatus}
                color="warning"
              />
              <StatCard
                icon={Clock}
                title="Uptime"
                value={`${Math.floor(stats.uptime / 60)}m`}
                color="secondary"
              />
            </div>
          </section>
        )}

        {/* Features Section */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need for a modern trading platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={Shield}
              title="Advanced Security"
              description="Multi-layer security with 2FA, encryption, and secure wallet integration for maximum protection."
              color="primary"
            />
            <FeatureCard
              icon={Zap}
              title="Real-time Updates"
              description="Live market data, instant notifications, and real-time trading updates with WebSocket technology."
              color="success"
            />
            <FeatureCard
              icon={Building}
              title="Multi-tenant Architecture"
              description="Support for multiple organizations with isolated data and customizable features."
              color="warning"
            />
            <FeatureCard
              icon={Smartphone}
              title="Mobile Responsive"
              description="Fully responsive design that works perfectly on all devices and screen sizes."
              color="secondary"
            />
            <FeatureCard
              icon={BarChart3}
              title="Advanced Analytics"
              description="Comprehensive reporting and analytics tools for better trading decisions."
              color="primary"
            />
            <FeatureCard
              icon={Users}
              title="User Management"
              description="Role-based access control with detailed user management and permissions."
              color="success"
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <h3 className="text-3xl font-bold mb-4">Ready to Start Trading?</h3>
            <p className="
