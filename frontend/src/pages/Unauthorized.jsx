import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
    <h1 className="text-4xl font-bold text-red-600 mb-4">دسترسی غیرمجاز</h1>
    <p className="text-lg text-gray-700 mb-6">شما اجازه دسترسی به این صفحه را ندارید.</p>
    <Link to="/dashboard" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700">بازگشت به داشبورد</Link>
  </div>
);

export default Unauthorized; 