import React, { useState } from 'react';

const sampleTenants = [
  { id: 1, name: 'صرافی پارس', code: 'PARS', owner: 'علی رضایی', plan: 'VIP', status: 'فعال', expire: '1403/12/29', created: '1402/01/15' },
  { id: 2, name: 'بانک آینده', code: 'AYANDEH', owner: 'مهدی محمدی', plan: 'طلایی', status: 'معلق', expire: '1403/06/01', created: '1401/11/10' },
];

const TenantManager = () => {
  const [tenants, setTenants] = useState(sampleTenants);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ name: '', code: '', owner: '', plan: 'پایه', status: 'فعال', expire: '', created: '' });
  const [editId, setEditId] = useState(null);

  // جستجو و فیلتر
  const filtered = tenants.filter(t =>
    t.name.includes(search) || t.code.includes(search) || t.owner.includes(search)
  );

  // ایجاد یا ویرایش Tenant
  const handleSave = () => {
    if (editId) {
      setTenants(tenants.map(t => t.id === editId ? { ...modalData, id: editId } : t));
    } else {
      setTenants([{ ...modalData, id: tenants.length + 1, created: new Date().toLocaleDateString('fa-IR') }, ...tenants]);
    }
    setShowModal(false);
    setEditId(null);
    setModalData({ name: '', code: '', owner: '', plan: 'پایه', status: 'فعال', expire: '', created: '' });
  };

  // حذف Tenant با تأیید
  const handleDelete = id => {
    if (window.confirm('آیا از حذف این Tenant مطمئن هستید؟')) {
      setTenants(tenants.filter(t => t.id !== id));
    }
  };

  // تعلیق/فعال‌سازی Tenant
  const handleToggleStatus = id => {
    setTenants(tenants.map(t => t.id === id ? { ...t, status: t.status === 'فعال' ? 'معلق' : 'فعال' } : t));
  };

  // باز کردن فرم ویرایش
  const handleEdit = t => {
    setModalData(t);
    setEditId(t.id);
    setShowModal(true);
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">مدیریت Tenantها</h2>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <input className="border rounded p-2" placeholder="جستجو بر اساس نام، کد یا مالک..." value={search} onChange={e => setSearch(e.target.value)} />
        <button className="bg-blue-600 text-white rounded px-4 py-2 font-bold" onClick={() => { setShowModal(true); setEditId(null); setModalData({ name: '', code: '', owner: '', plan: 'پایه', status: 'فعال', expire: '', created: '' }); }}>ایجاد Tenant جدید</button>
      </div>
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
                <td className="py-2 font-bold">{t.name}</td>
                <td>{t.code}</td>
                <td>{t.owner}</td>
                <td>{t.plan}</td>
                <td className={t.status === 'فعال' ? 'text-green-600' : 'text-yellow-600'}>{t.status}</td>
                <td>{t.expire}</td>
                <td>{t.created}</td>
                <td className="flex gap-2">
                  <button className="text-blue-600 underline" onClick={() => handleEdit(t)}>ویرایش</button>
                  <button className="text-yellow-600 underline" onClick={() => handleToggleStatus(t.id)}>{t.status === 'فعال' ? 'تعلیق' : 'فعال‌سازی'}</button>
                  <button className="text-red-600 underline" onClick={() => handleDelete(t.id)}>حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Modal فرم ایجاد/ویرایش */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editId ? 'ویرایش Tenant' : 'ایجاد Tenant جدید'}</h3>
            <div className="flex flex-col gap-3">
              <input className="border rounded p-2" placeholder="نام Tenant" value={modalData.name} onChange={e => setModalData({ ...modalData, name: e.target.value })} />
              <input className="border rounded p-2" placeholder="کد Tenant" value={modalData.code} onChange={e => setModalData({ ...modalData, code: e.target.value })} />
              <input className="border rounded p-2" placeholder="نام مالک" value={modalData.owner} onChange={e => setModalData({ ...modalData, owner: e.target.value })} />
              <select className="border rounded p-2" value={modalData.plan} onChange={e => setModalData({ ...modalData, plan: e.target.value })}>
                <option value="پایه">پایه</option>
                <option value="طلایی">طلایی</option>
                <option value="VIP">VIP</option>
              </select>
              <input className="border rounded p-2" placeholder="تاریخ انقضا (مثلاً 1403/12/29)" value={modalData.expire} onChange={e => setModalData({ ...modalData, expire: e.target.value })} />
            </div>
            <div className="flex gap-2 mt-4">
              <button className="bg-blue-600 text-white rounded px-4 py-2 font-bold" onClick={handleSave}>{editId ? 'ذخیره تغییرات' : 'ایجاد Tenant'}</button>
              <button className="bg-gray-300 rounded px-4 py-2 font-bold" onClick={() => setShowModal(false)}>انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantManager; 