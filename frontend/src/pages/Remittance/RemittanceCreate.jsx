import React from 'react';
import RemittanceSendForm from '../../components/RemittanceSendForm';

const RemittanceCreate = () => {
  const branches = [
    // TODO: دریافت لیست شعب از API یا Context
    { _id: 'branch1', name: 'شعبه ایران' },
    { _id: 'branch2', name: 'شعبه دبی' },
    { _id: 'branch3', name: 'شعبه ابوظبی' },
    { _id: 'branch4', name: 'شعبه شارجه' },
  ];
  const senderBranchId = 'branch1'; // TODO: مقدار واقعی بر اساس کاربر لاگین شده

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">ارسال حواله جدید</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">از این فرم برای ثبت و ارسال یک حواله جدید استفاده کنید.</p>
      {/* Form for creating a new remittance will go here */}
      <RemittanceSendForm branches={branches} senderBranchId={senderBranchId} />
    </div>
  );
};

export default RemittanceCreate; 