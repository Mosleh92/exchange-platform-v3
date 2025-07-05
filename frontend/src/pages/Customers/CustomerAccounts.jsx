import React from 'react';
import { useParams } from 'react-router-dom';

const CustomerAccounts = () => {
    const { id } = useParams();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">حساب‌های بانکی مشتری #{id}</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">حساب‌های بانکی ثبت شده برای این مشتری در این بخش نمایش داده می‌شود.</p>
      {/* Table for customer bank accounts will go here */}
    </div>
  );
};

export default CustomerAccounts; 