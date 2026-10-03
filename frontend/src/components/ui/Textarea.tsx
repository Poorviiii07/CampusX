import { forwardRef, TextareaHTMLAttributes } from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'ref'> {
  label?: string;
  error?: string;
  helperText?: string;
  register?: UseFormRegisterReturn;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, register, className = '', id, ...rest }, ref) => {
    const textareaId = id || register?.name;
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          {...register}
          {...rest}
          className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-400 ${
            error ? 'border-danger-400 focus:ring-danger-400' : 'border-gray-300'
          } ${className}`}
        />
        {error ? (
          <p className="text-xs text-danger-600">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-gray-500">{helperText}</p>
        ) : null}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

export default Textarea;
