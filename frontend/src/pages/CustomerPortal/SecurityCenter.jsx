import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SecurityCenter = () => {
  // تغییر رمز
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(null);
  const [pwError, setPwError] = useState(null);

  // OTP
  const [otpEnabled, setOtpEnabled] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMsg, setOtpMsg] = useState(null);

  // لاگ‌ها
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState(null);

  useEffect(() => {
    // دریافت وضعیت OTP و لاگ‌ها
    const fetchLogs = async () => {
      setLogsLoading(true);
      try {
        const res = await axios.get('/api/customers/my-audit-logs');
        setLogs(res.data.data || []);
      } catch (err) {
        setLogsError('خطا در دریافت لاگ‌های امنیتی');
      }
      setLogsLoading(false);
    };
    fetchLogs();
    // فرض: otpEnabled از پروفایل کاربر قابل دریافت است (در اینجا مقدار اولیه false)
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwLoading(true);
    setPwSuccess(null);
    setPwError(null);
    try {
      await axios.post('/api/customers/change-password', { oldPassword, newPassword });
      setPwSuccess('رمز عبور با موفقیت تغییر کرد.');
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      setPwError(err.response?.data?.message || 'خطا در تغییر رمز عبور');
    }
    setPwLoading(false);
  };

  const handleSetOtp = async (enable) => {
    setOtpLoading(true);
    setOtpMsg(null);
    try {
      await axios.post('/api/customers/set-otp', { enable });
      setOtpEnabled(enable);
      setOtpMsg(enable ? 'OTP با موفقیت فعال شد.' : 'OTP غیرفعال شد.');
    } catch (err) {
      setOtpMsg('خطا در تغییر وضعیت OTP');
    }
    setOtpLoading(false);
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">مرکز امنیت حساب</h1>
      {/* تغییر رمز عبور */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <div className="text-lg font-semibold mb-2">تغییر رمز عبور</div>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
          <input type="password" placeholder="رمز فعلی" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="border rounded p-2" required />
          <input type="password" placeholder="رمز جدید" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="border rounded p-2" required />
          <button type="submit" className="bg-blue-600 text-white rounded py-2 font-bold" disabled={pwLoading}>{pwLoading ? 'در حال ارسال...' : 'تغییر رمز'}</button>
          {pwSuccess && <div className="text-green-600 mt-2">{pwSuccess}</div>}
          {pwError && <div className="text-red-500 mt-2">{pwError}</div>}
        </form>
      </div>
      {/* OTP */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <div className="text-lg font-semibold mb-2">رمز یکبار مصرف (OTP)</div>
        <div className="flex items-center gap-4">
          <span>وضعیت: {otpEnabled ? <span className="text-green-600">فعال</span> : <span className="text-gray-500">غیرفعال</span>}</span>
          <button className={`rounded px-4 py-1 font-bold ${otpEnabled ? 'bg-red-500 text-white' : 'bg-green-600 text-white'}`} onClick={() => handleSetOtp(!otpEnabled)} disabled={otpLoading}>
            {otpEnabled ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
          </button>
        </div>
        {otpMsg && <div className="mt-2 text-blue-600">{otpMsg}</div>}
      </div>
      {/* لاگ‌های امنیتی */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <div className="text-lg font-semibold mb-2">لاگ‌های امنیتی و فعالیت</div>
        {logsLoading ? (
          <div>در حال بارگذاری...</div>
        ) : logsError ? (
          <div className="text-red-500">{logsError}</div>
        ) : logs.length === 0 ? (
          <div className="text-gray-400">لاگی ثبت نشده است.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b">
                  <th className="py-2">عملیات</th>
                  <th>توضیحات</th>
                  <th>تاریخ</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log._id} className="border-b hover:bg-gray-50">
                    <td className="py-2">{log.action || '-'}</td>
                    <td>{log.description || '-'}</td>
                    <td>{log.createdAt ? new Date(log.createdAt).toLocaleString('fa-IR') : '-'}</td>
                    <td>{log.ip || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityCenter; 