import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import RemittanceRedeemForm from '../../components/RemittanceRedeemForm';
import axios from 'axios';
import jsPDF from 'jspdf';

const statusMap = {
  pending: 'در انتظار',
  completed: 'برداشت شده',
  cancelled: 'لغو شده',
  expired: 'منقضی شده',
  approved: 'تایید شده',
  processing: 'در حال پردازش',
  failed: 'ناموفق',
  refunded: 'بازگشت شده',
};

const RemittanceDetails = () => {
  const { id } = useParams();
  const branchId = 'branch2'; // TODO: مقدار واقعی بر اساس شعبه مقصد کاربر لاگین شده
  const [remittance, setRemittance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    axios.get(`/api/remittances/${id}`)
      .then(res => setRemittance(res.data.data.remittance))
      .catch(() => setError('خطا در دریافت اطلاعات حواله'))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => {
    if (!remittance) return;
    const doc = new jsPDF();
    doc.setFont('IRANSans', 'normal');
    doc.setFontSize(16);
    doc.text('رسید حواله رمزدار بین شعب', 105, 18, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`کد حواله: ${remittance.secretCode || '-'}`, 20, 35);
    doc.text(`مبلغ: ${remittance.amount} ${remittance.fromCurrency}`, 20, 45);
    doc.text(`گیرنده: ${remittance.receiverInfo?.name || '-'}`, 20, 55);
    doc.text(`شعبه مقصد: ${remittance.receiverBranchId?.name || '-'}`, 20, 65);
    doc.text(`وضعیت: ${statusMap[remittance.status] || remittance.status}`, 20, 75);
    doc.text(`تاریخ ایجاد: ${remittance.createdAt ? new Date(remittance.createdAt).toLocaleString() : '-'}`, 20, 85);
    doc.text(`انقضا: ${remittance.expiresAt ? new Date(remittance.expiresAt).toLocaleString() : '-'}`, 20, 95);
    doc.text(`توضیح: ${remittance.notes?.sender || '-'}`, 20, 105);
    if (remittance.qrCode) {
      const img = remittance.qrCode.replace('image/png', 'image/jpeg');
      doc.addImage(img, 'JPEG', 140, 35, 50, 50);
    }
    doc.setFontSize(10);
    doc.text('این رسید را به همراه QR به شعبه مقصد ارائه دهید.', 20, 125);
    doc.save(`remittance_${remittance.secretCode || id}.pdf`);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">جزئیات حواله #{id}</h1>
      {loading ? <div>در حال بارگذاری...</div> : error ? <div className="text-red-600">{error}</div> : remittance && (
        <div className="bg-white rounded shadow p-4 my-4">
          <div className="mb-2"><b>کد حواله:</b> <span className="font-mono">{remittance.secretCode || '-'}</span></div>
          <div className="mb-2"><b>مبلغ:</b> {remittance.amount} {remittance.fromCurrency}</div>
          <div className="mb-2"><b>گیرنده:</b> {remittance.receiverInfo?.name}</div>
          <div className="mb-2"><b>شعبه مقصد:</b> {remittance.receiverBranchId?.name || '-'}</div>
          <div className="mb-2"><b>وضعیت فعلی:</b> {statusMap[remittance.status] || remittance.status}</div>
          <div className="mb-2"><b>تاریخ ایجاد:</b> {remittance.createdAt ? new Date(remittance.createdAt).toLocaleString() : '-'}</div>
          <div className="mb-2"><b>انقضا:</b> {remittance.expiresAt ? new Date(remittance.expiresAt).toLocaleString() : '-'}</div>
          {remittance.qrCode && <div className="mb-2"><b>QR حواله:</b><br /><img src={remittance.qrCode} alt="QR" style={{ width: 120 }} /></div>}
          <div className="mb-2"><b>توضیح:</b> {remittance.notes?.sender || '-'}</div>
          <div className="mb-2"><b>تاریخچه وضعیت:</b></div>
          <ul className="text-sm bg-gray-50 rounded p-2">
            {remittance.approvals && remittance.approvals.length > 0 ? remittance.approvals.map((a, i) => (
              <li key={i} className="mb-1">سطح {a.level}: {statusMap[a.status] || a.status} {a.approvedAt && `در ${new Date(a.approvedAt).toLocaleString()}`} {a.approverId && `توسط ${a.approverId.name || a.approverId}`}</li>
            )) : <li>تاریخچه‌ای ثبت نشده است.</li>}
            {remittance.status === 'completed' && remittance.redeemedAt && <li>برداشت حواله در {new Date(remittance.redeemedAt).toLocaleString()}</li>}
            {remittance.status === 'cancelled' && remittance.audit?.cancelledAt && <li>لغو حواله در {new Date(remittance.audit.cancelledAt).toLocaleString()}</li>}
          </ul>
          <button onClick={handlePrint} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">چاپ رسید حواله (PDF)</button>
        </div>
      )}
      <RemittanceRedeemForm branchId={branchId} />
    </div>
  );
};

export default RemittanceDetails; 