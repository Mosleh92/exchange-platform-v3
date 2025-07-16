import React, { useState, useRef, useEffect } from 'react';
import { format, parse, isValid, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import styles from './DatePicker.module.css';

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date) => void;
  placeholder?: string;
  format?: string;
  disabled?: boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  clearable?: boolean;
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date',
  format: dateFormat = 'MM/dd/yyyy',
  disabled = false,
  className = '',
  minDate,
  maxDate,
  clearable = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value || new Date());
  const [inputValue, setInputValue] = useState(value ? format(value, dateFormat) : '');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) {
      setInputValue(format(value, dateFormat));
      setCurrentMonth(value);
    } else {
      setInputValue('');
    }
  }, [value, dateFormat]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (newValue) {
      const parsedDate = parse(newValue, dateFormat, new Date());
      if (isValid(parsedDate)) {
        onChange?.(parsedDate);
      }
    }
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleDateClick = (date: Date) => {
    onChange?.(date);
    setInputValue(format(date, dateFormat));
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange?.(undefined as any);
    setInputValue('');
    setIsOpen(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const days = getDaysInMonth();

  return (
    <div ref={containerRef} className={`${styles.container} ${className}`}>
      <div className={styles.inputWrapper}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={styles.input}
          readOnly
        />
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={styles.calendarButton}
          disabled={disabled}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className={styles.calendar}>
          <div className={styles.header}>
            <button
              type="button"
              onClick={() => navigateMonth('prev')}
              className={styles.navButton}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15,18 9,12 15,6"></polyline>
              </svg>
            </button>
            
            <div className={styles.monthYear}>
              {format(currentMonth, 'MMMM yyyy')}
            </div>
            
            <button
              type="button"
              onClick={() => navigateMonth('next')}
              className={styles.navButton}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9,18 15,12 9,6"></polyline>
              </svg>
            </button>
          </div>

          <div className={styles.weekdays}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className={styles.weekday}>
                {day}
              </div>
            ))}
          </div>

          <div className={styles.days}>
            {days.map((day, index) => {
              const isSelected = value && isSameDay(day, value);
              const isCurrentDay = isToday(day);
              const isDisabled = isDateDisabled(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => !isDisabled && handleDateClick(day)}
                  className={`
                    ${styles.day}
                    ${isSelected ? styles.selected : ''}
                    ${isCurrentDay ? styles.today : ''}
                    ${isDisabled ? styles.disabled : ''}
                    ${!isCurrentMonth ? styles.otherMonth : ''}
                  `}
                  disabled={isDisabled}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {clearable && value && (
            <div className={styles.footer}>
              <button
                type="button"
                onClick={handleClear}
                className={styles.clearButton}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DatePicker; 