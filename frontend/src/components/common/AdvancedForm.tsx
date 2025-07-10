import React, { useState, useCallback } from 'react';
import { useForm, Controller, FieldError } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Button from './Button';
import FormInput from './FormInput';
import { LoadingSpinner } from './Loading';

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio';
  placeholder?: string;
  required?: boolean;
  validation?: yup.StringSchema | yup.NumberSchema | yup.BooleanSchema;
  options?: Array<{ value: string; label: string }>;
  helperText?: string;
  disabled?: boolean;
  defaultValue?: any;
}

interface FormStep {
  title: string;
  description?: string;
  fields: FormField[];
}

interface AdvancedFormProps {
  steps: FormStep[];
  onSubmit: (data: any) => Promise<void>;
  submitText?: string;
  loading?: boolean;
  className?: string;
  showStepIndicator?: boolean;
  allowStepNavigation?: boolean;
}

const AdvancedForm: React.FC<AdvancedFormProps> = ({
  steps,
  onSubmit,
  submitText = 'ثبت',
  loading = false,
  className,
  showStepIndicator = true,
  allowStepNavigation = true,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Build validation schema from all fields
  const buildValidationSchema = useCallback(() => {
    const schema: Record<string, any> = {};
    
    steps.forEach((step) => {
      step.fields.forEach((field) => {
        if (field.validation) {
          schema[field.name] = field.validation;
        } else if (field.required) {
          switch (field.type) {
            case 'email':
              schema[field.name] = yup.string().email('ایمیل معتبر نیست').required('این فیلد الزامی است');
              break;
            case 'number':
              schema[field.name] = yup.number().required('این فیلد الزامی است');
              break;
            case 'checkbox':
              schema[field.name] = yup.boolean().oneOf([true], 'این فیلد الزامی است');
              break;
            default:
              schema[field.name] = yup.string().required('این فیلد الزامی است');
          }
        }
      });
    });
    
    return yup.object().shape(schema);
  }, [steps]);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
    trigger,
  } = useForm({
    resolver: yupResolver(buildValidationSchema()),
    mode: 'onChange',
  });

  const watchedValues = watch();

  const handleStepSubmit = async (data: any): Promise<void> => {
    const newFormData = { ...formData, ...data };
    setFormData(newFormData);

    if (currentStep < steps.length - 1) {
      // Move to next step
      setCurrentStep(currentStep + 1);
    } else {
      // Submit final form
      await onSubmit(newFormData);
    }
  };

  const goToStep = async (stepIndex: number): Promise<void> => {
    if (!allowStepNavigation) return;

    // Validate current step before allowing navigation
    const currentStepFields = steps[currentStep].fields.map(field => field.name);
    const isValidStep = await trigger(currentStepFields);
    
    if (isValidStep || stepIndex < currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  const isStepValid = (stepIndex: number): boolean => {
    if (stepIndex > currentStep) return false;
    
    const stepFields = steps[stepIndex].fields.map(field => field.name);
    return stepFields.every(fieldName => !errors[fieldName]);
  };

  const renderField = (field: FormField): React.ReactNode => {
    const error = errors[field.name] as FieldError;
    
    switch (field.type) {
      case 'select':
        return (
          <Controller
            name={field.name}
            control={control}
            defaultValue={field.defaultValue}
            render={({ field: { onChange, value } }) => (
              <div className="form-group">
                <label className="form-label">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <select
                  className={`form-input ${error ? 'border-red-500' : ''}`}
                  onChange={onChange}
                  value={value || ''}
                  disabled={field.disabled}
                >
                  <option value="">انتخاب کنید</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {error && <p className="form-error">{error.message}</p>}
                {field.helperText && !error && (
                  <p className="text-sm text-gray-500 mt-1">{field.helperText}</p>
                )}
              </div>
            )}
          />
        );

      case 'textarea':
        return (
          <Controller
            name={field.name}
            control={control}
            defaultValue={field.defaultValue}
            render={({ field: { onChange, value } }) => (
              <div className="form-group">
                <label className="form-label">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <textarea
                  className={`form-input min-h-[100px] resize-vertical ${error ? 'border-red-500' : ''}`}
                  onChange={onChange}
                  value={value || ''}
                  placeholder={field.placeholder}
                  disabled={field.disabled}
                />
                {error && <p className="form-error">{error.message}</p>}
                {field.helperText && !error && (
                  <p className="text-sm text-gray-500 mt-1">{field.helperText}</p>
                )}
              </div>
            )}
          />
        );

      case 'checkbox':
        return (
          <Controller
            name={field.name}
            control={control}
            defaultValue={field.defaultValue || false}
            render={({ field: { onChange, value } }) => (
              <div className="form-group">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    onChange={onChange}
                    checked={value || false}
                    disabled={field.disabled}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </span>
                </label>
                {error && <p className="form-error">{error.message}</p>}
                {field.helperText && !error && (
                  <p className="text-sm text-gray-500 mt-1">{field.helperText}</p>
                )}
              </div>
            )}
          />
        );

      case 'radio':
        return (
          <Controller
            name={field.name}
            control={control}
            defaultValue={field.defaultValue}
            render={({ field: { onChange, value } }) => (
              <div className="form-group">
                <label className="form-label">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <div className="space-y-2">
                  {field.options?.map((option) => (
                    <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name={field.name}
                        value={option.value}
                        onChange={onChange}
                        checked={value === option.value}
                        disabled={field.disabled}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
                {error && <p className="form-error">{error.message}</p>}
                {field.helperText && !error && (
                  <p className="text-sm text-gray-500 mt-1">{field.helperText}</p>
                )}
              </div>
            )}
          />
        );

      default:
        return (
          <Controller
            name={field.name}
            control={control}
            defaultValue={field.defaultValue}
            render={({ field: { onChange, value } }) => (
              <FormInput
                label={field.label}
                type={field.type}
                placeholder={field.placeholder}
                value={value || ''}
                onChange={onChange}
                error={error?.message}
                helperText={field.helperText}
                disabled={field.disabled}
                required={field.required}
              />
            )}
          />
        );
    }
  };

  return (
    <div className={className}>
      {/* Step Indicator */}
      {showStepIndicator && steps.length > 1 && (
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <button
                  onClick={() => goToStep(index)}
                  disabled={!allowStepNavigation || index > currentStep}
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                    index === currentStep
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : index < currentStep
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-300 bg-white text-gray-400'
                  } ${!allowStepNavigation || index > currentStep ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {index < currentStep ? '✓' : index + 1}
                </button>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 ${
                    index < currentStep ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {steps[currentStep].title}
            </h2>
            {steps[currentStep].description && (
              <p className="text-sm text-gray-600 mt-1">
                {steps[currentStep].description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(handleStepSubmit)} className="space-y-6">
        <div className="space-y-4">
          {steps[currentStep].fields.map((field) => (
            <div key={field.name}>
              {renderField(field)}
            </div>
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t border-gray-200">
          <div>
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={loading}
              >
                مرحله قبل
              </Button>
            )}
          </div>
          
          <div className="flex space-x-2">
            {currentStep < steps.length - 1 ? (
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={!isValid}
              >
                مرحله بعد
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={!isValid}
              >
                {loading ? (
                  <div className="flex items-center">
                    <LoadingSpinner size="sm" color="white" className="mr-2" />
                    در حال ثبت...
                  </div>
                ) : (
                  submitText
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdvancedForm; 