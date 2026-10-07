import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'ref'> {
  label?: string;
  error?: string;
  helperText?: string;
  register?: UseFormRegisterReturn;
  leftIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, register, leftIcon, className = '', id, ...rest }, ref) => {
    const inputId = id || register?.name;
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{leftIcon}</span>
          )}
          <input
            id={inputId}
            ref={ref}
            {...register}
            {...rest}
            className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 ${leftIcon ? 'pl-9' : ''} ${
              error ? 'border-danger-400 focus:ring-danger-400' : 'border-primary-200'
            } ${className}`}
          />
        </div>
        {error ? (
          <p className="text-xs text-danger-600">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-gray-500">{helperText}</p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = 'Input';

export default Input;
