import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const ResetPassword = () => {
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const token = searchParams.get('token');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
        return toast.error('توکن بازیابی نامعتبر است.');
    }
    if (formData.password !== formData.confirmPassword) {
      return toast.error('رمزهای عبور یکسان نیستند');
    }
    const { success, error } = await resetPassword({ token, password: formData.password });
    if (success) {
      toast.success('رمز عبور شما با موفقیت تغییر کرد.');
      navigate('/auth/login');
    } else {
      toast.error(error || 'خطا در تغییر رمز عبور');
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">
        بازنشانی رمز عبور
      </h2>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="mt-8 content-center">
          <label className="text-sm font-bold text-gray-700 dark:text-gray-300 tracking-wide">رمز عبور جدید</label>
          <input
            name="password"
            type="password"
            required
            onChange={handleChange}
            className="w-full text-base py-2 border-b border-gray-300 focus:outline-none focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
            placeholder="رمز عبور جدید را وارد کنید"
          />
        </div>
        <div className="mt-8 content-center">
          <label className="text-sm font-bold text-gray-700 dark:text-gray-300 tracking-wide">تکرار رمز عبور جدید</label>
          <input
            name="confirmPassword"
            type="password"
            required
            onChange={handleChange}
            className="w-full text-base py-2 border-b border-gray-300 focus:outline-none focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
            placeholder="رمز عبور جدید را تکرار کنید"
          />
        </div>
        <div>
          <button type="submit" className="w-full flex justify-center bg-indigo-500 text-gray-100 p-4 rounded-full tracking-wide font-semibold focus:outline-none focus:shadow-outline hover:bg-indigo-600 shadow-lg cursor-pointer transition ease-in duration-300">
            تغییر رمز عبور
          </button>
        </div>
      </form>
    </>
  );
};

export default ResetPassword; 