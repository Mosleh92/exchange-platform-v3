import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:4000/plans';

const SalesPlanManagement = () => {
  const [plans, setPlans] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ id: null, name: '', price: '', duration: 'ماهانه', features: '', status: 'فعال' });
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setPlans(data);
    } catch (err) {
      setError('خطا در دریافت پلن‌ها');
    }
    setLoading(false);
  };

  const filtered = plans.filter(p =>
    p.name.includes(search) || p.features.includes(search) || p.duration.includes(search)
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
          body: JSON.stringify(modalData)
        });
      }
      await fetchPlans();
      setShowModal(false);
      setModalData({ id: null, name: '', price: '', duration: 'ماهانه', features: '', status: 'فعال' });
      setEditId(null);
    } catch (err) {
      setError('خطا در ذخیره پلن');
    }
    setLoading(false);
  };

  const handleEdit = (plan) => {
    setModalData(plan);
    setEditId(plan.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف پلن مطمئن هستید؟')) return;
    setLoading(true);
    setError('');
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      await fetchPlans();
    } catch (err) {
      setError('خطا در حذف پلن');
    }
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">مدیریت پلن‌های فروش</h1>
      <div className="flex items-center gap-4 mb-4">
        <input
          className="border rounded px-3 py-2 w-64"
          placeholder="جستجو بر اساس نام یا ویژگی..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => { setShowModal(true); setEditId(null); setModalData({ id: null, name: '', price: '', duration: 'ماهانه', features: '', status: 'فعال' }); }}>افزودن پلن جدید</button>
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {loading ? (
        <div className="text-center py-8">در حال بارگذاری...</div>
      ) : (
        <div className="bg-white rounded shadow p-4 overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b">
                <th className="py-2">نام پلن</th>
                <th>قیمت (ریال)</th>
                <th>مدت</th>
                <th>ویژگی‌ها</th>
                <th>وضعیت</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td>{p.name}</td>
                  <td>{(+p.price).toLocaleString()}</td>
                  <td>{p.duration}</td>
                  <td>{p.features}</td>
                  <td>{p.status}</td>
                  <td className="flex gap-2">
                    <button className="text-blue-600 underline" onClick={() => handleEdit(p)}>ویرایش</button>
                    <button className="text-red-600 underline" onClick={() => handleDelete(p.id)}>حذف</button>
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
            <h3 className="text-lg font-bold mb-4">{editId ? 'ویرایش پلن' : 'افزودن پلن جدید'}</h3>
            <div className="flex flex-col gap-3">
              <input className="border rounded p-2" placeholder="نام پلن" value={modalData.name} onChange={e => setModalData({ ...modalData, name: e.target.value })} />
              <input className="border rounded p-2" placeholder="قیمت (ریال)" type="number" value={modalData.price} onChange={e => setModalData({ ...modalData, price: e.target.value })} />
              <select className="border rounded p-2" value={modalData.duration} onChange={e => setModalData({ ...modalData, duration: e.target.value })}>
                <option value="ماهانه">ماهانه</option>
                <option value="سالانه">سالانه</option>
              </select>
              <input className="border rounded p-2" placeholder="ویژگی‌ها (مثلاً: تا 5 کاربر، 1 شعبه)" value={modalData.features} onChange={e => setModalData({ ...modalData, features: e.target.value })} />
              <select className="border rounded p-2" value={modalData.status} onChange={e => setModalData({ ...modalData, status: e.target.value })}>
                <option value="فعال">فعال</option>
                <option value="تعلیق">تعلیق</option>
              </select>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="bg-blue-600 text-white rounded px-4 py-2 font-bold" onClick={handleSave}>{editId ? 'ذخیره تغییرات' : 'افزودن پلن'}</button>
              <button className="bg-gray-300 rounded px-4 py-2 font-bold" onClick={() => setShowModal(false)}>انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPlanManagement; 