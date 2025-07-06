import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:4000/users';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ id: null, name: '', email: '', role: 'staff', status: 'فعال' });
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // دریافت کاربران از API
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError('خطا در دریافت کاربران');
    }
    setLoading(false);
  };

  const filtered = users.filter(u =>
    u.name.includes(search) || u.email.includes(search) || u.role.includes(search)
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
      await fetchUsers();
      setShowModal(false);
      setModalData({ id: null, name: '', email: '', role: 'staff', status: 'فعال' });
      setEditId(null);
    } catch (err) {
      setError('خطا در ذخیره کاربر');
    }
    setLoading(false);
  };

  const handleEdit = (user) => {
    setModalData(user);
    setEditId(user.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف کاربر مطمئن هستید؟')) return;
    setLoading(true);
    setError('');
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      await fetchUsers();
    } catch (err) {
      setError('خطا در حذف کاربر');
    }
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">مدیریت کاربران</h1>
      <div className="flex items-center gap-4 mb-4">
        <input
          className="border rounded px-3 py-2 w-64"
          placeholder="جستجو بر اساس نام، ایمیل یا نقش..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => { setShowModal(true); setEditId(null); setModalData({ id: null, name: '', email: '', role: 'staff', status: 'فعال' }); }}>افزودن کاربر جدید</button>
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
                <th>ایمیل</th>
                <th>نقش</th>
                <th>وضعیت</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.status}</td>
                  <td className="flex gap-2">
                    <button className="text-blue-600 underline" onClick={() => handleEdit(u)}>ویرایش</button>
                    <button className="text-red-600 underline" onClick={() => handleDelete(u.id)}>حذف</button>
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
            <h3 className="text-lg font-bold mb-4">{editId ? 'ویرایش کاربر' : 'افزودن کاربر جدید'}</h3>
            <div className="flex flex-col gap-3">
              <input className="border rounded p-2" placeholder="نام" value={modalData.name} onChange={e => setModalData({ ...modalData, name: e.target.value })} />
              <input className="border rounded p-2" placeholder="ایمیل" value={modalData.email} onChange={e => setModalData({ ...modalData, email: e.target.value })} />
              <select className="border rounded p-2" value={modalData.role} onChange={e => setModalData({ ...modalData, role: e.target.value })}>
                <option value="tenant_admin">مدیر صرافی</option>
                <option value="branch_manager">مدیر شعبه</option>
                <option value="staff">کارمند</option>
              </select>
              <select className="border rounded p-2" value={modalData.status} onChange={e => setModalData({ ...modalData, status: e.target.value })}>
                <option value="فعال">فعال</option>
                <option value="تعلیق">تعلیق</option>
              </select>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="bg-blue-600 text-white rounded px-4 py-2 font-bold" onClick={handleSave}>{editId ? 'ذخیره تغییرات' : 'افزودن کاربر'}</button>
              <button className="bg-gray-300 rounded px-4 py-2 font-bold" onClick={() => setShowModal(false)}>انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement; 