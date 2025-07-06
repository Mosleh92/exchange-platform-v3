import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { success, error } = await forgotPassword(email);
    if (success) {
      toast.success('ایمیل بازیابی رمز عبور برای شما ارسال شد.');
    } else {
      toast.error(error || 'خطا در ارسال ایمیل');
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">
        فراموشی رمز عبور
      </h2>
      <p className="text-center text-gray-600 dark:text-gray-400 mt-2">
        ایمیل خود را وارد کنید تا لینک بازیابی برایتان ارسال شود.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="relative">
          <label className="text-sm font-bold text-gray-700 dark:text-gray-300 tracking-wide">ایمیل</label>
          <input
            name="email"
            type="email"
            required
            onChange={(e) => setEmail(e.target.value)}
            className="w-full text-base py-2 border-b border-gray-300 focus:outline-none focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
            placeholder="ایمیل ثبت شده خود را وارد کنید"
          />
        </div>
        <div>
          <button type="submit" className="w-full flex justify-center bg-indigo-500 text-gray-100 p-4 rounded-full tracking-wide font-semibold focus:outline-none focus:shadow-outline hover:bg-indigo-600 shadow-lg cursor-pointer transition ease-in duration-300">
            ارسال لینک بازیابی
          </button>
        </div>
        <p className="flex flex-col items-center justify-center mt-10 text-center text-md text-gray-500">
          <Link to="/auth/login" className="text-indigo-500 hover:text-indigo-500no-underline hover:underline cursor-pointer transition ease-in duration-300">
            بازگشت به صفحه ورود
          </Link>
        </p>
      </form>
    </>
  );
};

export default ForgotPassword; 