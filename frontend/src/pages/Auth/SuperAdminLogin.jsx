import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function SuperAdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/super-admin-login', { username, password });
      if (res.data.success) {
        navigate('/super-admin-dashboard');
      } else {
        setError('نام کاربری یا رمز اشتباه است');
      }
    } catch {
      setError('نام کاربری یا رمز اشتباه است');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow max-w-sm w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">ورود سوپرادمین</h2>
        <input
          type="text"
          placeholder="نام کاربری سوپرادمین"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="border px-3 py-2 rounded w-full mb-4"
          required
        />
        <input
          type="password"
          placeholder="رمز عبور"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="border px-3 py-2 rounded w-full mb-4"
          required
        />
        {error && <div className="text-red-600 mb-4 text-center">{error}</div>}
        <button
          type="submit"
          className="bg-blue-600 text-white w-full py-2 rounded font-bold"
          disabled={loading}
        >
          {loading ? 'در حال ورود...' : 'ورود'}
        </button>
      </form>
    </div>
  );
}

export default SuperAdminLogin; 