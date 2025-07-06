import React, { useState } from 'react';
import axios from 'axios';

const fields = [
  { key: 'smtp_user', label: 'SMTP User', type: 'text' },
  { key: 'smtp_pass', label: 'SMTP Password', type: 'password' },
  { key: 'kavenegar_api_key', label: 'Kavenegar API Key', type: 'password' },
  { key: 'twilio_sid', label: 'Twilio SID', type: 'text' },
  { key: 'twilio_auth_token', label: 'Twilio Auth Token', type: 'password' },
  { key: 'twilio_whatsapp_from', label: 'Twilio WhatsApp From', type: 'text' }
];

function SuperAdminSettings() {
  const [values, setValues] = useState({});
  const [show, setShow] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchSetting = async (key) => {
    try {
      const res = await axios.get(`/api/settings?key=${key}`);
      setValues(v => ({ ...v, [key]: res.data.value }));
    } catch {
      setValues(v => ({ ...v, [key]: '' }));
    }
  };

  const handleChange = (key, value) => setValues(v => ({ ...v, [key]: value }));

  const handleSave = async (key) => {
    setLoading(true);
    try {
      await axios.post('/api/settings', { key, value: values[key] });
      setMessage('ذخیره شد');
    } catch {
      setMessage('خطا در ذخیره');
    }
    setLoading(false);
  };

  React.useEffect(() => {
    fields.forEach(f => fetchSetting(f.key));
    // eslint-disable-next-line
  }, []);

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">تنظیمات سرویس‌های اعلان (فقط سوپرادمین)</h2>
      {fields.map(f => (
        <div key={f.key} className="mb-4">
          <label className="block font-medium mb-1">{f.label}</label>
          <div className="flex items-center">
            <input
              type={show[f.key] ? 'text' : f.type}
              value={values[f.key] || ''}
              onChange={e => handleChange(f.key, e.target.value)}
              className="border px-3 py-2 rounded w-full"
              disabled={loading}
            />
            {f.type === 'password' && (
              <button
                type="button"
                className="ml-2 text-blue-600"
                onClick={() => setShow(s => ({ ...s, [f.key]: !s[f.key] }))}
              >
                {show[f.key] ? 'مخفی' : 'نمایش'}
              </button>
            )}
            <button
              type="button"
              className="ml-2 bg-green-600 text-white px-3 py-1 rounded"
              onClick={() => handleSave(f.key)}
              disabled={loading}
            >
              ذخیره
            </button>
          </div>
        </div>
      ))}
      {message && <div className="mt-4 text-center text-green-700">{message}</div>}
    </div>
  );
}

export default SuperAdminSettings; 