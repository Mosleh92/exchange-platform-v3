import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return toast.error('رمزهای عبور یکسان نیستند');
    }
    const { success, error } = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password
    });
    if (success) {
      toast.success('ثبت‌نام موفقیت‌آمیز بود! لطفاً وارد شوید.');
      navigate('/auth/login');
    } else {
      toast.error(error || 'خطا در ثبت‌نام');
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">
        ایجاد حساب کاربری جدید
      </h2>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="relative">
          <label className="text-sm font-bold text-gray-700 dark:text-gray-300 tracking-wide">نام کامل</label>
          <input
            name="name"
            type="text"
            required
            onChange={handleChange}
            className="w-full text-base py-2 border-b border-gray-300 focus:outline-none focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
            placeholder="نام خود را وارد کنید"
          />
        </div>
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
        <div className="mt-8 content-center">
          <label className="text-sm font-bold text-gray-700 dark:text-gray-300 tracking-wide">تکرار رمز عبور</label>
          <input
            name="confirmPassword"
            type="password"
            required
            onChange={handleChange}
            className="w-full text-base py-2 border-b border-gray-300 focus:outline-none focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
            placeholder="رمز عبور خود را تکرار کنید"
          />
        </div>
        <div>
          <button type="submit" className="w-full flex justify-center bg-indigo-500 text-gray-100 p-4 rounded-full tracking-wide font-semibold focus:outline-none focus:shadow-outline hover:bg-indigo-600 shadow-lg cursor-pointer transition ease-in duration-300">
            ثبت‌نام
          </button>
        </div>
        <p className="flex flex-col items-center justify-center mt-10 text-center text-md text-gray-500">
          <span>حساب کاربری دارید؟</span>
          <Link to="/auth/login" className="text-indigo-500 hover:text-indigo-500no-underline hover:underline cursor-pointer transition ease-in duration-300">
            وارد شوید
          </Link>
        </p>
      </form>
    </>
  );
};

export default Register; 