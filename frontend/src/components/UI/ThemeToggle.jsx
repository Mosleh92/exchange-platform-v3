// frontend/src/components/UI/ThemeToggle.jsx
import React from 'react';
import { useTheme } from '../../hooks/useTheme';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`
                relative inline-flex items-center justify-center w-12 h-6 rounded-full transition-colors duration-200 ease-in-out
                ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            `}
            aria-label="Toggle dark mode"
        >
            <span
                className={`
                    inline-block w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out
                    ${theme === 'dark' ? 'translate-x-3' : '-translate-x-3'}
                `}
            />
            <span className="sr-only">
                {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            </span>
            
            {/* Icons */}
            <div className="absolute inset-0 flex items-center justify-between px-1">
                <span className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                    ☀️
                </span>
                <span className={`text-xs ${theme === 'dark' ? 'text-yellow-400' : 'text-gray-400'}`}>
                    🌙
                </span>
            </div>
        </button>
    );
};

export default ThemeToggle;