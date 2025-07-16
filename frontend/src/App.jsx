// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Simple components for deployment testing
function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>🚀 Exchange Platform V3</h1>
      <p>Frontend is working correctly!</p>
      <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '8px', margin: '1rem 0' }}>
        <h3>✅ Deployment Status</h3>
        <ul>
          <li>✅ React application loaded</li>
          <li>✅ Routing working</li>
          <li>✅ Build completed successfully</li>
        </ul>
      </div>
      <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px' }}>
        <h3>API Test</h3>
        <button 
          onClick={() => fetch('/api/health').then(r => r.json()).then(data => alert(JSON.stringify(data, null, 2)))}
          style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Test API Connection
        </button>
      </div>
    </div>
  );
}

function About() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>About Exchange Platform</h1>
      <p>Multi-tenant cryptocurrency exchange platform built with React and Node.js</p>
      <a href="/" style={{ color: '#2563eb' }}>← Back to Home</a>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<div style={{padding: '2rem'}}>Page not found. <a href="/">Go home</a></div>} />
      </Routes>
    </Router>
  );
}

export default App;