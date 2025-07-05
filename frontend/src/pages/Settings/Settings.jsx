import React from 'react';
import { Link, Outlet } from 'react-router-dom';

const Settings = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">تنظیمات</h1>
      <nav className="mt-4">
        <Link to="profile" className="px-3 py-2 text-indigo-500 border-b-2 border-indigo-500">پروفایل</Link>
        {/* Other settings links can go here */}
      </nav>
      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
};

export default Settings; 