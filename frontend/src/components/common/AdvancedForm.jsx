import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import './AdvancedForm.css';

/**
 * Comprehensive Advanced Form Component
 * Features: Multi-step, Validation, File Upload, Dynamic Fields, Auto-save
 */
const AdvancedForm = ({ 
  config = {},
  initialData = {},
  onSubmit,
  onCancel,
  onSaveDraft,
  isSubmitting = false
}) => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [touched, setTouched] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({});
  
  const formRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-save functionality
  useEffect(() => {
    if (isDirty && onSaveDraft) {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
      
      const timer = setTimeout(() => {
        onSaveDraft(formData);
        setIsDirty(false);
      }, 3000); // Auto-save after 3 seconds of inactivity
      
      setAutoSaveTimer(timer);
    }

    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [formData, isDirty, onSaveDraft]);

  // Load draft data
  useEffect(() => {
    const savedDraft = localStorage.getItem(`form-draft-${config.id}`);
    if (savedDraft && !Object.keys(initialData).length) {
      try {
        const draftData = JSON.parse(savedDraft);
        setFormData(draftData);
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }, [config.id, initialData]);

  // Validation rules
  const validationRules = {
    required: (value) => value && value.toString().trim().length > 0,
    email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    phone: (value) => /^[\+]?[1-9][\d]{0,15}$/.test(value),
    minLength: (value, min) => value && value.toString().length >= min,
    maxLength: (value, max) => value && value.toString().length <= max,
    numeric: (value) => !isNaN(value) && !isNaN(parseFloat(value)),
    positive: (value) => parseFloat(value) > 0,
    url: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }
  };

  // Validate field
  const validateField = (fieldName, value, rules) => {
    const fieldErrors = [];

    rules.forEach(rule => {
      if (typeof rule === 'string') {
        if (rule === 'required' && !validationRules.required(value)) {
          fieldErrors.push('This field is required');
        }
      } else if (typeof rule === 'object') {
        const { type, params } = rule;
        if (!validationRules[type](value, params)) {
          fieldErrors.push(rule.message || `Invalid ${type}`);
        }
      }
    });

    return fieldErrors;
  };

  // Validate entire form
  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    config.fields.forEach(field => {
      const value = getFieldValue(field.name);
      const fieldErrors = validateField(field.name, value, field.validation || []);
      
      if (fieldErrors.length > 0) {
        newErrors[field.name] = fieldErrors;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  // Get field value (supports nested objects)
  const getFieldValue = (fieldName) => {
    return fieldName.split('.').reduce((obj, key) => obj?.[key], formData);
  };

  // Set field value (supports nested objects)
  const setFieldValue = (fieldName, value) => {
    const keys = fieldName.split('.');
    const newData = { ...formData };
    let current = newData;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    setFormData(newData);
    setIsDirty(true);
  };

  // Handle field change
  const handleFieldChange = (fieldName, value) => {
    setFieldValue(fieldName, value);
    
    // Clear field error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: []
      }));
    }

    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));
  };

  // Handle file upload
  const handleFileUpload = async (fieldName, files) => {
    const uploadedFiles = [];
    
    for (let file of files) {
      try {
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: 0
        }));

        const formData = new FormData();
        formData.append('file', file);
        formData.append('field', fieldName);

        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'x-tenant-id': currentTenant._id
          },
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          uploadedFiles.push(result);
          
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: 100
          }));
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: -1
        }));
        console.error('File upload error:', error);
      }
    }

    const currentFiles = getFieldValue(fieldName) || [];
    setFieldValue(fieldName, [...currentFiles, ...uploadedFiles]);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      
      // Clear draft after successful submission
      localStorage.removeItem(`form-draft-${config.id}`);
      setIsDirty(false);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  // Navigate to step
  const goToStep = (step) => {
    if (step >= 0 && step < config.steps?.length) {
      setCurrentStep(step);
    }
  };

  // Render field based on type
  const renderField = (field) => {
    const value = getFieldValue(field.name);
    const fieldErrors = errors[field.name] || [];
    const isTouched = touched[field.name];
    const showErrors = isTouched && fieldErrors.length > 0;

    const commonProps = {
      id: field.name,
      name: field.name,
      value: value || '',
      onChange: (e) => handleFieldChange(field.name, e.target.value),
      onBlur: () => setTouched(prev => ({ ...prev, [field.name]: true })),
      className: `form-field ${showErrors ? 'error' : ''} ${field.className || ''}`,
      placeholder: field.placeholder,
      disabled: field.disabled || isSubmitting
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'url':
      case 'number':
        return (
          <div className="field-container">
            <label htmlFor={field.name} className="field-label">
              {field.label}
              {field.required && <span className="required">*</span>}
            </label>
            <input
              {...commonProps}
              type={field.type}
              min={field.min}
              max={field.max}
              step={field.step}
            />
            {showErrors && (
              <div className="field-errors">
                {fieldErrors.map((error, index) => (
                  <span key={index} className="error-message">{error}</span>
                ))}
              </div>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div className="field-container">
            <label htmlFor={field.name} className="field-label">
              {field.label}
              {field.required && <span className="required">*</span>}
            </label>
            <textarea
              {...commonProps}
              rows={field.rows || 4}
            />
            {showErrors && (
              <div className="field-errors">
                {fieldErrors.map((error, index) => (
                  <span key={index} className="error-message">{error}</span>
                ))}
              </div>
            )}
          </div>
        );

      case 'select':
        return (
          <div className="field-container">
            <label htmlFor={field.name} className="field-label">
              {field.label}
              {field.required && <span className="required">*</span>}
            </label>
            <select {...commonProps}>
              {field.placeholder && (
                <option value="">{field.placeholder}</option>
              )}
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {showErrors && (
              <div className="field-errors">
                {fieldErrors.map((error, index) => (
                  <span key={index} className="error-message">{error}</span>
                ))}
              </div>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div className="field-container">
            <label className="checkbox-label">
              <input
                {...commonProps}
                type="checkbox"
                checked={value || false}
                onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              />
              <span className="checkmark"></span>
              {field.label}
              {field.required && <span className="required">*</span>}
            </label>
            {showErrors && (
              <div className="field-errors">
                {fieldErrors.map((error, index) => (
                  <span key={index} className="error-message">{error}</span>
                ))}
              </div>
            )}
          </div>
        );

      case 'radio':
        return (
          <div className="field-container">
            <label className="field-label">
              {field.label}
              {field.required && <span className="required">*</span>}
            </label>
            <div className="radio-group">
              {field.options?.map(option => (
                <label key={option.value} className="radio-label">
                  <input
                    type="radio"
                    name={field.name}
                    value={option.value}
                    checked={value === option.value}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    disabled={field.disabled || isSubmitting}
                  />
                  <span className="radio-checkmark"></span>
                  {option.label}
                </label>
              ))}
            </div>
            {showErrors && (
              <div className="field-errors">
                {fieldErrors.map((error, index) => (
                  <span key={index} className="error-message">{error}</span>
                ))}
              </div>
            )}
          </div>
        );

      case 'file':
        return (
          <div className="field-container">
            <label htmlFor={field.name} className="field-label">
              {field.label}
              {field.required && <span className="required">*</span>}
            </label>
            <div className="file-upload-area">
              <input
                ref={fileInputRef}
                type="file"
                multiple={field.multiple}
                accept={field.accept}
                onChange={(e) => handleFileUpload(field.name, e.target.files)}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
              >
                Choose Files
              </button>
              <span className="file-hint">
                {field.hint || 'Click to select files'}
              </span>
            </div>
            
            {/* File list */}
            {value && value.length > 0 && (
              <div className="file-list">
                {value.map((file, index) => (
                  <div key={index} className="file-item">
                    <span className="file-name">{file.name}</span>
                    {uploadProgress[file.name] !== undefined && (
                      <div className="upload-progress">
                        {uploadProgress[file.name] === 100 ? (
                          <span className="upload-success">✓</span>
                        ) : uploadProgress[file.name] === -1 ? (
                          <span className="upload-error">✗</span>
                        ) : (
                          <span className="upload-progress-text">
                            {uploadProgress[file.name]}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {showErrors && (
              <div className="field-errors">
                {fieldErrors.map((error, index) => (
                  <span key={index} className="error-message">{error}</span>
                ))}
              </div>
            )}
          </div>
        );

      case 'date':
        return (
          <div className="field-container">
            <label htmlFor={field.name} className="field-label">
              {field.label}
              {field.required && <span className="required">*</span>}
            </label>
            <input
              {...commonProps}
              type="date"
              min={field.min}
              max={field.max}
            />
            {showErrors && (
              <div className="field-errors">
                {fieldErrors.map((error, index) => (
                  <span key={index} className="error-message">{error}</span>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Render step navigation
  const renderStepNavigation = () => {
    if (!config.steps) return null;

    return (
      <div className="step-navigation">
        {config.steps.map((step, index) => (
          <button
            key={index}
            className={`step-button ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
            onClick={() => goToStep(index)}
            disabled={isSubmitting}
          >
            <span className="step-number">{index + 1}</span>
            <span className="step-label">{step.title}</span>
          </button>
        ))}
      </div>
    );
  };

  // Get current step fields
  const getCurrentStepFields = () => {
    if (config.steps) {
      return config.steps[currentStep]?.fields || [];
    }
    return config.fields || [];
  };

  return (
    <div className="advanced-form">
      <form ref={formRef} onSubmit={handleSubmit} className="form-content">
        {/* Form Header */}
        {config.title && (
          <div className="form-header">
            <h2>{config.title}</h2>
            {config.description && (
              <p className="form-description">{config.description}</p>
            )}
          </div>
        )}

        {/* Step Navigation */}
        {renderStepNavigation()}

        {/* Form Fields */}
        <div className="form-fields">
          {getCurrentStepFields().map((field, index) => (
            <div key={field.name || index} className="field-wrapper">
              {renderField(field)}
            </div>
          ))}
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          {config.steps && currentStep > 0 && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => goToStep(currentStep - 1)}
              disabled={isSubmitting}
            >
              Previous
            </button>
          )}

          {config.steps && currentStep < config.steps.length - 1 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => goToStep(currentStep + 1)}
              disabled={isSubmitting}
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : (config.submitText || 'Submit')}
            </button>
          )}

          {onCancel && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
        </div>

        {/* Auto-save indicator */}
        {isDirty && onSaveDraft && (
          <div className="auto-save-indicator">
            💾 Auto-saving draft...
          </div>
        )}
      </form>
    </div>
  );
};

export default AdvancedForm; 