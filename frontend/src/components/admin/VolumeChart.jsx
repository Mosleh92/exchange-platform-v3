import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

function VolumeChart({ companyId, days = 30 }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get(`/api/report/volume/daily?companyId=${companyId}&days=${days}`)
      .then(res => {
        setData(res.data.dailyVolume.map(item => ({
          date: item._id,
          volume: item.volume
        })));
      });
  }, [companyId, days]);

  return (
    <div>
      <h3>نمودار حجم معاملات روزانه</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="volume" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default VolumeChart; 