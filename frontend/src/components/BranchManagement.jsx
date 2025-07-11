import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  DollarSign,
  Activity,
  Filter,
  Search
} from 'lucide-react';

const BranchManagement = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    type: '',
    city: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });

  useEffect(() => {
    fetchBranches();
  }, [filters, pagination.page]);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });

      const response = await fetch(`/api/branches?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setBranches(data.branches);
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total
        }));
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
