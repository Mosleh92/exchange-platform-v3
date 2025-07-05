import { useEffect, useState } from 'react';
import axios from 'axios';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

export function useTransactions({ page = 1, pageSize = 20, search = '', startDate, endDate, type, currency, status }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    setLoading(true);
    axios
      .get('/api/transactions/my-transactions', {
        params: {
          page,
          pageSize,
          search: debouncedSearch,
          startDate,
          endDate,
          type,
          currency,
          status,
        },
      })
      .then((res) => {
        setData((res.data.data && res.data.data.transactions) || []);
        setTotal(res.data.data?.total || 0);
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [page, pageSize, debouncedSearch, startDate, endDate, type, currency, status]);

  return { data, total, loading, error };
} 