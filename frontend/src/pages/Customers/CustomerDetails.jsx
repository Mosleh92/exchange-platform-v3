import React from 'react';
import { useParams } from 'react-router-dom';

const CustomerDetails = () => {
  const { id } = useParams();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">جزئیات مشتری #{id}</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">اطلاعات کامل مشتری و تاریخچه تراکنش‌های او در این بخش قابل مشاهده است.</p>
      {/* Detailed view of a single customer will go here */}
    </div>
  );
};

export default CustomerDetails; 