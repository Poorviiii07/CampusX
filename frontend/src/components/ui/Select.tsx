import { forwardRef, SelectHTMLAttributes } from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'ref'> {
  label?: string;
  error?: string;
  helperText?: string;
  register?: UseFormRegisterReturn;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, register, options, placeholder, className = '', id, ...rest }, ref) => {
    const selectId = id || register?.name;
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          {...register}
          {...rest}
          className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-400 ${
            error ? 'border-danger-400 focus:ring-danger-400' : 'border-gray-300'
          } ${className}`}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error ? (
          <p className="text-xs text-danger-600">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-gray-500">{helperText}</p>
        ) : null}
      </div>
    );
  },
);
Select.displayName = 'Select';

export default Select;
