import React from 'react'
import { Routes, Route } from 'react-router-dom'

const HomePage = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="container mx-auto px-4 py-16">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Exchange Platform V3
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          A comprehensive multi-tenant exchange platform built with modern technologies.
        </p>
        <div className="space-x-4">
          <button className="btn btn-primary">Get Started</button>
          <button className="btn btn-secondary">Learn More</button>
        </div>
      </div>
    </div>
  </div>
)

function App() {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<div className="text-center py-20">404 - Page Not Found</div>} />
      </Routes>
    </div>
  )
}

export default App
