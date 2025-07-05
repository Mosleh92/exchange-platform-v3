import React, { useState, useEffect } from 'react';

const SalesPlanForm = ({ initialData, onSave, onCancel }) => {
    const [plan, setPlan] = useState({
        name: '',
        price: '',
        currency: 'USD',
        duration: 'monthly',
        isActive: true,
        isDefault: false,
        features: {
            maxUsers: 5,
            maxBranches: 1,
            transactionFeePercent: 1,
            supportLevel: 'basic',
            analyticsAccess: false,
            p2pTrading: false
        }
    });

    useEffect(() => {
        if (initialData) {
            setPlan({ ...initialData });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setPlan(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleFeatureChange = (e) => {
        const { name, value, type, checked } = e.target;
        setPlan(prev => ({
            ...prev,
            features: {
                ...prev.features,
                [name]: type === 'checkbox' ? checked : Number(value)
            }
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(plan);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Plan Name</label>
                    <input type="text" name="name" id="name" value={plan.name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600"/>
                </div>
                <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Price</label>
                    <input type="number" name="price" id="price" value={plan.price} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600"/>
                </div>
                <div>
                    <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
                    <input type="text" name="currency" id="currency" value={plan.currency} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600"/>
                </div>
                <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Duration</label>
                    <select name="duration" id="duration" value={plan.duration} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600">
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
            </div>

            <fieldset className="border-t border-gray-200 pt-4">
                <legend className="text-lg font-medium text-gray-900 dark:text-white">Features</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                        <label htmlFor="maxUsers" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Max Users</label>
                        <input type="number" name="maxUsers" id="maxUsers" value={plan.features.maxUsers} onChange={handleFeatureChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"/>
                    </div>
                     <div>
                        <label htmlFor="maxBranches" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Max Branches</label>
                        <input type="number" name="maxBranches" id="maxBranches" value={plan.features.maxBranches} onChange={handleFeatureChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"/>
                    </div>
                     <div>
                        <label htmlFor="transactionFeePercent" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Transaction Fee (%)</label>
                        <input type="number" step="0.01" name="transactionFeePercent" id="transactionFeePercent" value={plan.features.transactionFeePercent} onChange={handleFeatureChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600"/>
                    </div>
                    <div>
                        <label htmlFor="supportLevel" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Support Level</label>
                        <select name="supportLevel" id="supportLevel" value={plan.features.supportLevel} onChange={handleFeatureChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600">
                            <option value="basic">Basic</option>
                            <option value="premium">Premium</option>
                            <option value="enterprise">Enterprise</option>
                        </select>
                    </div>
                    <div className="flex items-center">
                        <input type="checkbox" name="analyticsAccess" id="analyticsAccess" checked={plan.features.analyticsAccess} onChange={handleFeatureChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                        <label htmlFor="analyticsAccess" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Analytics Access</label>
                    </div>
                     <div className="flex items-center">
                        <input type="checkbox" name="p2pTrading" id="p2pTrading" checked={plan.features.p2pTrading} onChange={handleFeatureChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                        <label htmlFor="p2pTrading" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">P2P Trading</label>
                    </div>
                </div>
            </fieldset>

             <fieldset className="border-t border-gray-200 pt-4">
                 <legend className="text-lg font-medium text-gray-900 dark:text-white">Plan Status</legend>
                 <div className="space-y-2 mt-2">
                    <div className="flex items-center">
                        <input type="checkbox" name="isActive" id="isActive" checked={plan.isActive} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Active</label>
                    </div>
                    <div className="flex items-center">
                        <input type="checkbox" name="isDefault" id="isDefault" checked={plan.isDefault} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                        <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Set as Default Plan</label>
                    </div>
                 </div>
             </fieldset>

            <div className="flex justify-end pt-4">
                <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded mr-2 hover:bg-gray-300">Cancel</button>
                <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Save Plan</button>
            </div>
        </form>
    );
};

export default SalesPlanForm;
