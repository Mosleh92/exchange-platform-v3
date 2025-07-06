import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { success, error } = await login(formData);
    if (!success) {
      toast.error(error || 'ایمیل یا رمز عبور اشتباه است');
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">
        ورود به حساب کاربری
      </h2>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="relative">
          <label className="text-sm font-bold text-gray-700 dark:text-gray-300 tracking-wide">ایمیل</label>
          <input
            name="email"
            type="email"
            required
            onChange={handleChange}
            className="w-full text-base py-2 border-b border-gray-300 focus:outline-none focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
            placeholder="ایمیل خود را وارد کنید"
          />
        </div>
        <div className="mt-8 content-center">
          <label className="text-sm font-bold text-gray-700 dark:text-gray-300 tracking-wide">رمز عبور</label>
          <input
            name="password"
            type="password"
            required
            onChange={handleChange}
            className="w-full text-base py-2 border-b border-gray-300 focus:outline-none focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
            placeholder="رمز عبور خود را وارد کنید"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input id="remember_me" name="remember_me" type="checkbox" className="h-4 w-4 bg-indigo-500 focus:ring-indigo-400 border-gray-300 rounded" />
            <label htmlFor="remember_me" className="mr-2 block text-sm text-gray-900 dark:text-gray-300">
              مرا به خاطر بسپار
            </label>
          </div>
          <div className="text-sm">
            <Link to="/auth/forgot-password" className="font-medium text-indigo-500 hover:text-indigo-500">
              رمز عبور خود را فراموش کرده‌اید؟
            </Link>
          </div>
        </div>
        <div>
          <button type="submit" className="w-full flex justify-center bg-indigo-500 text-gray-100 p-4 rounded-full tracking-wide font-semibold focus:outline-none focus:shadow-outline hover:bg-indigo-600 shadow-lg cursor-pointer transition ease-in duration-300">
            ورود
          </button>
        </div>
        <p className="flex flex-col items-center justify-center mt-10 text-center text-md text-gray-500">
          <span>حساب کاربری ندارید؟</span>
          <Link to="/auth/register" className="text-indigo-500 hover:text-indigo-500no-underline hover:underline cursor-pointer transition ease-in duration-300">
            ثبت‌نام کنید
          </Link>
        </p>
      </form>
    </>
  );
};

export default Login; 