import { useId, useRef, useState, ChangeEvent, DragEvent } from 'react';
import { UploadCloud, X } from 'lucide-react';

export interface FileInputProps {
  label?: string;
  accept?: string;
  error?: string;
  helperText?: string;
  onChange?: (file: File | null) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileInput({ label, accept, error, helperText, onChange }: FileInputProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(selected: File | null) {
    setFile(selected);
    onChange?.(selected);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFile(dropped);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
  }

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
      {!file ? (
        <div
          role="button"
          tabIndex={0}
          aria-labelledby={label ? undefined : inputId}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={() => setDragging(false)}
          className={`flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
            dragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'
          }`}
        >
          <UploadCloud className="text-gray-400" size={28} />
          <p className="text-sm text-gray-600">Click to browse or drag a file here</p>
          {helperText && <p className="text-xs text-gray-400">{helperText}</p>}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-gray-50">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-800 truncate max-w-xs">{file.name}</span>
            <span className="text-xs text-gray-500">{formatSize(file.size)}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              handleFile(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            aria-label="Remove file"
            className="text-gray-400 hover:text-danger-600"
          >
            <X size={18} />
          </button>
        </div>
      )}
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e: ChangeEvent<HTMLInputElement>) => handleFile(e.target.files?.[0] ?? null)}
      />
      {error && <p className="text-xs text-danger-600">{error}</p>}
    </div>
  );
}

export default FileInput;
