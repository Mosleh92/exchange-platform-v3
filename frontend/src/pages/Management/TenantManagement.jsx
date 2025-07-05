import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:4000/tenants';

const TenantManagement = () => {
  const [tenants, setTenants] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ id: null, name: '', code: '', owner: '', plan: 'پایه', status: 'فعال', expire: '', created: '' });
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setTenants(data);
    } catch (err) {
      setError('خطا در دریافت صرافی‌ها');
    }
    setLoading(false);
  };

  const filtered = tenants.filter(t =>
    t.name.includes(search) || t.code.includes(search) || t.owner.includes(search) || t.plan.includes(search)
  );

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      if (editId) {
        await fetch(`${API_URL}/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...modalData, id: editId })
        });
      } else {
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...modalData, created: new Date().toLocaleDateString('fa-IR') })
        });
      }
      await fetchTenants();
      setShowModal(false);
      setModalData({ id: null, name: '', code: '', owner: '', plan: 'پایه', status: 'فعال', expire: '', created: '' });
      setEditId(null);
    } catch (err) {
      setError('خطا در ذخیره صرافی');
    }
    setLoading(false);
  };

  const handleEdit = (tenant) => {
    setModalData(tenant);
    setEditId(tenant.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف صرافی مطمئن هستید؟')) return;
    setLoading(true);
    setError('');
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      await fetchTenants();
    } catch (err) {
      setError('خطا در حذف صرافی');
    }
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">مدیریت صرافی‌ها</h1>
      <div className="flex items-center gap-4 mb-4">
        <input
          className="border rounded px-3 py-2 w-64"
          placeholder="جستجو بر اساس نام، کد، مالک یا پلن..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => { setShowModal(true); setEditId(null); setModalData({ id: null, name: '', code: '', owner: '', plan: 'پایه', status: 'فعال', expire: '', created: '' }); }}>افزودن صرافی جدید</button>
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {loading ? (
        <div className="text-center py-8">در حال بارگذاری...</div>
      ) : (
        <div className="bg-white rounded shadow p-4 overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b">
                <th className="py-2">نام</th>
                <th>کد</th>
                <th>مالک</th>
                <th>پلن</th>
                <th>وضعیت</th>
                <th>تاریخ انقضا</th>
                <th>تاریخ ایجاد</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td>{t.name}</td>
                  <td>{t.code}</td>
                  <td>{t.owner}</td>
                  <td>{t.plan}</td>
                  <td className={t.status === 'فعال' ? 'text-green-600' : 'text-yellow-600'}>{t.status}</td>
                  <td>{t.expire}</td>
                  <td>{t.created}</td>
                  <td className="flex gap-2">
                    <button className="text-blue-600 underline" onClick={() => handleEdit(t)}>ویرایش</button>
                    <button className="text-yellow-600 underline" onClick={() => handleEdit({ ...t, status: t.status === 'فعال' ? 'تعلیق' : 'فعال' })}>{t.status === 'فعال' ? 'تعلیق' : 'فعال‌سازی'}</button>
                    <button className="text-red-600 underline" onClick={() => handleDelete(t.id)}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Modal فرم ایجاد/ویرایش */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editId ? 'ویرایش صرافی' : 'افزودن صرافی جدید'}</h3>
            <div className="flex flex-col gap-3">
              <input className="border rounded p-2" placeholder="نام صرافی" value={modalData.name} onChange={e => setModalData({ ...modalData, name: e.target.value })} />
              <input className="border rounded p-2" placeholder="کد صرافی" value={modalData.code} onChange={e => setModalData({ ...modalData, code: e.target.value })} />
              <input className="border rounded p-2" placeholder="نام مالک" value={modalData.owner} onChange={e => setModalData({ ...modalData, owner: e.target.value })} />
              <select className="border rounded p-2" value={modalData.plan} onChange={e => setModalData({ ...modalData, plan: e.target.value })}>
                <option value="پایه">پایه</option>
                <option value="طلایی">طلایی</option>
                <option value="VIP">VIP</option>
              </select>
              <input className="border rounded p-2" placeholder="تاریخ انقضا (مثلاً 1403/12/29)" value={modalData.expire} onChange={e => setModalData({ ...modalData, expire: e.target.value })} />
            </div>
            <div className="flex gap-2 mt-4">
              <button className="bg-blue-600 text-white rounded px-4 py-2 font-bold" onClick={handleSave}>{editId ? 'ذخیره تغییرات' : 'افزودن صرافی'}</button>
              <button className="bg-gray-300 rounded px-4 py-2 font-bold" onClick={() => setShowModal(false)}>انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantManagement; 