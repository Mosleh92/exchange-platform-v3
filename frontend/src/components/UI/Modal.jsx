import React from 'react';
import ReactDOM from 'react-dom';
import { FaTimes } from 'react-icons/fa';

const Modal = ({ onClose, children, title }) => {
    const modalRoot = document.getElementById('modal-root');

    if (!modalRoot) {
        const root = document.createElement('div');
        root.id = 'modal-root';
        document.body.appendChild(root);
    }

    return ReactDOM.createPortal(
        <>
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
                onClick={onClose}
            ></div>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl transform transition-all">
                    <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                        <button 
                            onClick={onClose} 
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <FaTimes />
                        </button>
                    </div>
                    <div className="p-6">
                        {children}
                    </div>
                </div>
            </div>
        </>,
        document.getElementById('modal-root')
    );
};

export default Modal;
