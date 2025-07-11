import React from 'react'

const SimpleDemo = () => {
  const [currentView, setCurrentView] = React.useState('tenant')

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      direction: 'rtl'
    },
    nav: {
      backgroundColor: 'white',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      borderBottom: '1px solid #e5e7eb'
    },
    navContent: {
      maxWidth: '80rem',
      margin: '0 auto',
      padding: '0 1rem',
      display: 'flex',
      justifyContent: 'space-between',
      height: '4rem',
      alignItems: 'center'
    },
    title: {
      fontSize: '1.25rem',
      fontWeight: 'bold',
      color: '#111827'
    },
    buttonGroup: {
      display: 'flex',
      gap: '1rem'
    },
    button: {
      padding: '0.5rem 1rem',
      borderRadius: '0.5rem',
      border: 'none',
      cursor: 'pointer',
      fontWeight: '500'
    },
    activeButton: {
      backgroundColor: '#2563eb',
      color: 'white'
    },
    inactiveButton: {
      backgroundColor: '#e5e7eb',
      color: '#374151'
    },
    main: {
      padding: '1.5rem',
      margin: '0 auto',
      maxWidth: '80rem'
    },
    heading: {
      fontSize: '1.875rem',
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: '1.5rem'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '1.5rem',
      marginBottom: '1.5rem'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb'
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    cardTitle: {
      fontSize: '0.875rem',
      fontWeight: '500',
      color: '#6b7280',
      marginBottom: '0.25rem'
    },
    cardValue: {
      fontSize: '1.875rem',
      fontWeight: 'bold',
      color: '#111827'
    },
    icon: {
      width: '3rem',
      height: '3rem',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    iconBlue: { backgroundColor: '#dbeafe' },
    iconGreen: { backgroundColor: '#dcfce7' },
    iconPurple: { backgroundColor: '#f3e8ff' },
    iconYellow: { backgroundColor: '#fef3c7' },
    iconRed: { backgroundColor: '#fee2e2' },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      padding: '0.75rem 1.5rem',
      textAlign: 'right',
      fontSize: '0.75rem',
      fontWeight: '500',
      color: '#6b7280',
      textTransform: 'uppercase',
      backgroundColor: '#f9fafb',
      borderBottom: '1px solid #e5e7eb'
    },
    td: {
      padding: '1rem 1.5rem',
      fontSize: '0.875rem',
      color: '#111827',
      borderBottom: '1px solid #e5e7eb'
    },
    statusBadge: {
      display: 'inline-flex',
      padding: '0.125rem 0.5rem',
      fontSize: '0.75rem',
      fontWeight: '600',
      borderRadius: '9999px'
    },
    statusActive: {
      backgroundColor: '#dcfce7',
      color: '#166534'
    },
    statusInactive: {
      backgroundColor: '#fee2e2',
      color: '#dc2626'
    }
  }

  const TenantDashboardDemo = () => (
    <div style={styles.main}>
      <h1 style={styles.heading}>داشبورد صرافی اصلی</h1>
      
      {/* Key Metrics Cards */}
      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.cardTitle}>تعداد شعبات</p>
              <p style={styles.cardValue}>5</p>
            </div>
            <div style={{...styles.icon, ...styles.iconBlue}}>
              <div style={{width: '1.5rem', height: '1.5rem', backgroundColor: '#2563eb', borderRadius: '0.25rem'}}></div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.cardTitle}>تعداد کارمندان</p>
              <p style={styles.cardValue}>20</p>
            </div>
            <div style={{...styles.icon, ...styles.iconGreen}}>
              <div style={{width: '1.5rem', height: '1.5rem', backgroundColor: '#16a34a', borderRadius: '0.25rem'}}></div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.cardTitle}>تعداد مشتریان</p>
              <p style={styles.cardValue}>300</p>
            </div>
            <div style={{...styles.icon, ...styles.iconPurple}}>
              <div style={{width: '1.5rem', height: '1.5rem', backgroundColor: '#9333ea', borderRadius: '0.25rem'}}></div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.cardTitle}>درآمد ماهانه</p>
              <p style={styles.cardValue}>120M ریال</p>
            </div>
            <div style={{...styles.icon, ...styles.iconYellow}}>
              <div style={{width: '1.5rem', height: '1.5rem', backgroundColor: '#eab308', borderRadius: '0.25rem'}}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Branch Management Section */}
      <div style={styles.card}>
        <div style={{padding: '1.5rem 1.5rem 1rem 1.5rem', borderBottom: '1px solid #e5e7eb'}}>
          <h2 style={{fontSize: '1.25rem', fontWeight: '600', color: '#111827'}}>مدیریت شعبات</h2>
        </div>
        <div style={{padding: '1.5rem'}}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>نام شعبه</th>
                <th style={styles.th}>کد شعبه</th>
                <th style={styles.th}>مدیر</th>
                <th style={styles.th}>درآمد ماهانه</th>
                <th style={styles.th}>وضعیت</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{'&:hover': {backgroundColor: '#f9fafb'}}}>
                <td style={styles.td}>شعبه مرکزی</td>
                <td style={styles.td}>BR001</td>
                <td style={styles.td}>مدیر الف</td>
                <td style={styles.td}>45,000,000 ریال</td>
                <td style={styles.td}>
                  <span style={{...styles.statusBadge, ...styles.statusActive}}>فعال</span>
                </td>
              </tr>
              <tr>
                <td style={styles.td}>شعبه غرب</td>
                <td style={styles.td}>BR002</td>
                <td style={styles.td}>مدیر ب</td>
                <td style={styles.td}>35,000,000 ریال</td>
                <td style={styles.td}>
                  <span style={{...styles.statusBadge, ...styles.statusActive}}>فعال</span>
                </td>
              </tr>
              <tr>
                <td style={styles.td}>شعبه شرق</td>
                <td style={styles.td}>BR003</td>
                <td style={styles.td}>مدیر ج</td>
                <td style={styles.td}>25,000,000 ریال</td>
                <td style={styles.td}>
                  <span style={{...styles.statusBadge, ...styles.statusActive}}>فعال</span>
                </td>
              </tr>
              <tr>
                <td style={styles.td}>شعبه شمال</td>
                <td style={styles.td}>BR004</td>
                <td style={styles.td}>مدیر د</td>
                <td style={styles.td}>15,000,000 ریال</td>
                <td style={styles.td}>
                  <span style={{...styles.statusBadge, ...styles.statusInactive}}>غیرفعال</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const BranchDashboardDemo = () => (
    <div style={styles.main}>
      <h1 style={styles.heading}>داشبورد شعبه مرکزی</h1>
      
      {/* Key Metrics Cards */}
      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.cardTitle}>معاملات امروز</p>
              <p style={styles.cardValue}>45</p>
            </div>
            <div style={{...styles.icon, ...styles.iconBlue}}>
              <div style={{width: '1.5rem', height: '1.5rem', backgroundColor: '#2563eb', borderRadius: '0.25rem'}}></div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.cardTitle}>مشتریان فعال</p>
              <p style={styles.cardValue}>89</p>
            </div>
            <div style={{...styles.icon, ...styles.iconGreen}}>
              <div style={{width: '1.5rem', height: '1.5rem', backgroundColor: '#16a34a', borderRadius: '0.25rem'}}></div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.cardTitle}>درآمد ماهانه</p>
              <p style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#111827'}}>45M ریال</p>
            </div>
            <div style={{...styles.icon, ...styles.iconYellow}}>
              <div style={{width: '1.5rem', height: '1.5rem', backgroundColor: '#eab308', borderRadius: '0.25rem'}}></div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.cardTitle}>حواله در انتظار</p>
              <p style={styles.cardValue}>12</p>
            </div>
            <div style={{...styles.icon, ...styles.iconRed}}>
              <div style={{width: '1.5rem', height: '1.5rem', backgroundColor: '#dc2626', borderRadius: '0.25rem'}}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Balance Section */}
      <div style={styles.card}>
        <div style={{padding: '1.5rem 1.5rem 1rem 1.5rem', borderBottom: '1px solid #e5e7eb'}}>
          <h2 style={{fontSize: '1.25rem', fontWeight: '600', color: '#111827'}}>موجودی نقدینگی شعبه</h2>
        </div>
        <div style={{padding: '1.5rem'}}>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem'}}>
            <div style={{textAlign: 'center', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem'}}>
              <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#111827'}}>500M</div>
              <div style={{fontSize: '0.875rem', color: '#6b7280'}}>IRR</div>
            </div>
            <div style={{textAlign: 'center', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem'}}>
              <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#111827'}}>15,000</div>
              <div style={{fontSize: '0.875rem', color: '#6b7280'}}>USD</div>
            </div>
            <div style={{textAlign: 'center', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem'}}>
              <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#111827'}}>8,000</div>
              <div style={{fontSize: '0.875rem', color: '#6b7280'}}>EUR</div>
            </div>
            <div style={{textAlign: 'center', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem'}}>
              <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#111827'}}>25,000</div>
              <div style={{fontSize: '0.875rem', color: '#6b7280'}}>AED</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div style={{...styles.card, marginTop: '1.5rem'}}>
        <div style={{padding: '1.5rem 1.5rem 1rem 1.5rem', borderBottom: '1px solid #e5e7eb'}}>
          <h2 style={{fontSize: '1.25rem', fontWeight: '600', color: '#111827'}}>آخرین معاملات</h2>
        </div>
        <div style={{padding: '1.5rem'}}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>مشتری</th>
                <th style={styles.th}>نوع</th>
                <th style={styles.th}>ارز</th>
                <th style={styles.th}>مبلغ</th>
                <th style={styles.th}>نرخ</th>
                <th style={styles.th}>زمان</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={styles.td}>محمد رضایی</td>
                <td style={styles.td}>
                  <span style={{...styles.statusBadge, backgroundColor: '#dcfce7', color: '#166534'}}>خرید</span>
                </td>
                <td style={styles.td}>USD</td>
                <td style={styles.td}>1,000</td>
                <td style={styles.td}>42,500</td>
                <td style={styles.td}>10:30</td>
              </tr>
              <tr>
                <td style={styles.td}>فاطمه کریمی</td>
                <td style={styles.td}>
                  <span style={{...styles.statusBadge, backgroundColor: '#dbeafe', color: '#1e40af'}}>فروش</span>
                </td>
                <td style={styles.td}>EUR</td>
                <td style={styles.td}>500</td>
                <td style={styles.td}>46,200</td>
                <td style={styles.td}>10:15</td>
              </tr>
              <tr>
                <td style={styles.td}>حسن مرادی</td>
                <td style={styles.td}>
                  <span style={{...styles.statusBadge, backgroundColor: '#f3e8ff', color: '#7c3aed'}}>حواله</span>
                </td>
                <td style={styles.td}>AED</td>
                <td style={styles.td}>2,000</td>
                <td style={styles.td}>11,580</td>
                <td style={styles.td}>09:45</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const CustomerManagementDemo = () => (
    <div style={styles.main}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
        <h1 style={styles.heading}>مدیریت مشتریان</h1>
        <button style={{...styles.button, ...styles.activeButton}}>
          ثبت مشتری جدید
        </button>
      </div>

      {/* Search and Filters */}
      <div style={{...styles.card, marginBottom: '1.5rem'}}>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
          <input 
            type="text" 
            placeholder="جستجو..." 
            style={{border: '1px solid #d1d5db', borderRadius: '0.5rem', padding: '0.5rem 0.75rem'}} 
          />
          <select style={{border: '1px solid #d1d5db', borderRadius: '0.5rem', padding: '0.5rem 0.75rem'}}>
            <option>همه وضعیت‌ها</option>
            <option>فعال</option>
            <option>غیرفعال</option>
          </select>
          <select style={{border: '1px solid #d1d5db', borderRadius: '0.5rem', padding: '0.5rem 0.75rem'}}>
            <option>همه شعبات</option>
            <option>شعبه مرکزی</option>
            <option>شعبه غرب</option>
          </select>
          <button style={{...styles.button, backgroundColor: '#6b7280', color: 'white'}}>
            خروجی CSV
          </button>
        </div>
      </div>

      {/* Customer Table */}
      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>نام</th>
              <th style={styles.th}>کد ملی</th>
              <th style={styles.th}>تماس</th>
              <th style={styles.th}>شعبه</th>
              <th style={styles.th}>آمار معاملات</th>
              <th style={styles.th}>وضعیت</th>
              <th style={styles.th}>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.td}>
                <div style={{display: 'flex', alignItems: 'center'}}>
                  <div style={{
                    backgroundColor: '#e5e7eb', 
                    borderRadius: '50%', 
                    width: '2.5rem', 
                    height: '2.5rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginLeft: '0.75rem',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    مر
                  </div>
                  <div>
                    <div style={{fontSize: '0.875rem', fontWeight: '500', color: '#111827'}}>محمد رضایی</div>
                    <div style={{fontSize: '0.875rem', color: '#6b7280'}}>mohammad@email.com</div>
                  </div>
                </div>
              </td>
              <td style={styles.td}>1234567890</td>
              <td style={styles.td}>09123456789</td>
              <td style={styles.td}>شعبه مرکزی</td>
              <td style={styles.td}>
                <div>45 معامله</div>
                <div style={{fontSize: '0.75rem', color: '#9ca3af'}}>125M ریال</div>
              </td>
              <td style={styles.td}>
                <span style={{...styles.statusBadge, ...styles.statusActive}}>فعال</span>
              </td>
              <td style={styles.td}>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <button style={{color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer'}}>مشاهده</button>
                  <button style={{color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer'}}>ویرایش</button>
                  <button style={{color: '#9333ea', background: 'none', border: 'none', cursor: 'pointer'}}>معامله</button>
                </div>
              </td>
            </tr>
            <tr>
              <td style={styles.td}>
                <div style={{display: 'flex', alignItems: 'center'}}>
                  <div style={{
                    backgroundColor: '#e5e7eb', 
                    borderRadius: '50%', 
                    width: '2.5rem', 
                    height: '2.5rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginLeft: '0.75rem',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    فک
                  </div>
                  <div>
                    <div style={{fontSize: '0.875rem', fontWeight: '500', color: '#111827'}}>فاطمه کریمی</div>
                    <div style={{fontSize: '0.875rem', color: '#6b7280'}}>fateme@email.com</div>
                  </div>
                </div>
              </td>
              <td style={styles.td}>0987654321</td>
              <td style={styles.td}>09123456788</td>
              <td style={styles.td}>شعبه غرب</td>
              <td style={styles.td}>
                <div>23 معامله</div>
                <div style={{fontSize: '0.75rem', color: '#9ca3af'}}>67M ریال</div>
              </td>
              <td style={styles.td}>
                <span style={{...styles.statusBadge, ...styles.statusActive}}>فعال</span>
              </td>
              <td style={styles.td}>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <button style={{color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer'}}>مشاهده</button>
                  <button style={{color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer'}}>ویرایش</button>
                  <button style={{color: '#9333ea', background: 'none', border: 'none', cursor: 'pointer'}}>معامله</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div style={styles.container}>
      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <h1 style={styles.title}>سیستم مدیریت صرافی v3</h1>
          <div style={styles.buttonGroup}>
            <button
              onClick={() => setCurrentView('tenant')}
              style={{
                ...styles.button,
                ...(currentView === 'tenant' ? styles.activeButton : styles.inactiveButton)
              }}
            >
              داشبورد صرافی
            </button>
            <button
              onClick={() => setCurrentView('branch')}
              style={{
                ...styles.button,
                ...(currentView === 'branch' ? styles.activeButton : styles.inactiveButton)
              }}
            >
              داشبورد شعبه
            </button>
            <button
              onClick={() => setCurrentView('customers')}
              style={{
                ...styles.button,
                ...(currentView === 'customers' ? styles.activeButton : styles.inactiveButton)
              }}
            >
              مدیریت مشتریان
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {currentView === 'tenant' && <TenantDashboardDemo />}
        {currentView === 'branch' && <BranchDashboardDemo />}
        {currentView === 'customers' && <CustomerManagementDemo />}
      </main>
    </div>
  )
}

export default SimpleDemo