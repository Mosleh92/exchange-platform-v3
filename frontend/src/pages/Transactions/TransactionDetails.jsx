import React from 'react';
import { useParams } from 'react-router-dom';

const TransactionDetails = () => {
  const { id } = useParams();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">جزئیات تراکنش #{id}</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">اطلاعات کامل تراکنش در این بخش نمایش داده می‌شود.</p>
      {/* Detailed view of a single transaction will go here */}
    </div>
  );
};

export default TransactionDetails; 