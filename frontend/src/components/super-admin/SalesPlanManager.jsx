import React, { useState, useEffect } from 'react';
import api from '../../../services/api'; // Assuming a configured axios instance
import { toast } from 'react-toastify';
import SalesPlanForm from './SalesPlanForm'; // A new component for the form
import SalesPlanTable from './SalesPlanTable'; // A new component for the table
import Modal from '../../UI/Modal'; // A generic modal component

const SalesPlanManager = () => {
    const [salesPlans, setSalesPlans] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);

    const fetchSalesPlans = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/super-admin/sales-plans');
            setSalesPlans(response.data);
            setError(null);
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to fetch sales plans';
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSalesPlans();
    }, []);

    const handleOpenModal = (plan = null) => {
        setSelectedPlan(plan);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedPlan(null);
        setIsModalOpen(false);
    };

    const handleSavePlan = async (planData) => {
        try {
            if (selectedPlan) {
                // Update
                await api.put(`/super-admin/sales-plans/${selectedPlan._id}`, planData);
                toast.success('Sales plan updated successfully!');
            } else {
                // Create
                await api.post('/super-admin/sales-plans', planData);
                toast.success('Sales plan created successfully!');
            }
            fetchSalesPlans(); // Refresh data
            handleCloseModal();
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to save sales plan';
            toast.error(message);
        }
    };

    const handleDeletePlan = async (planId) => {
        if (window.confirm('Are you sure you want to delete this sales plan?')) {
            try {
                await api.delete(`/super-admin/sales-plans/${planId}`);
                toast.success('Sales plan deleted successfully!');
                fetchSalesPlans(); // Refresh data
            } catch (err) {
                const message = err.response?.data?.message || 'Failed to delete sales plan';
                toast.error(message);
            }
        }
    };

    return (
        <div className="container mx-auto p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Sales Plan Management</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-300"
                >
                    Create New Plan
                </button>
            </div>

            {isLoading && <p>Loading plans...</p>}
            {error && <p className="text-red-500">{error}</p>}
            
            {!isLoading && !error && (
                <SalesPlanTable 
                    plans={salesPlans} 
                    onEdit={handleOpenModal} 
                    onDelete={handleDeletePlan} 
                />
            )}

            {isModalOpen && (
                <Modal onClose={handleCloseModal} title={selectedPlan ? 'Edit Sales Plan' : 'Create Sales Plan'}>
                    <SalesPlanForm
                        initialData={selectedPlan}
                        onSave={handleSavePlan}
                        onCancel={handleCloseModal}
                    />
                </Modal>
            )}
        </div>
    );
};

export default SalesPlanManager;
