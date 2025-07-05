import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

function ProfitLossChart({ companyId, days = 30 }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get(`/api/report/profit-loss/daily?companyId=${companyId}&days=${days}`)
      .then(res => {
        setData(res.data.profitAndLoss.map(item => ({
          date: item._id,
          profit: item.profit
        })));
      });
  }, [companyId, days]);

  return (
    <div>
      <h3>نمودار سود و زیان روزانه</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="profit" stroke="#ff7300" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ProfitLossChart; 