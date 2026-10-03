import { ReactNode, ThHTMLAttributes } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import Skeleton from './Skeleton';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  sortKey?: string;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  sort?: { key: string; direction: 'asc' | 'desc' };
  onSort?: (key: string) => void;
}

export function Table<T>({
  columns,
  data,
  rowKey,
  loading,
  emptyMessage = 'No records found',
  sort,
  onSort,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left font-semibold text-gray-600 ${col.className ?? ''}`}
              >
                {col.sortable && col.sortKey && onSort ? (
                  <button
                    type="button"
                    onClick={() => onSort(col.sortKey!)}
                    className="inline-flex items-center gap-1 hover:text-primary-700"
                  >
                    {col.header}
                    {sort?.key === col.sortKey ? (
                      sort.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    ) : (
                      <ChevronsUpDown size={14} className="text-gray-400" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={columns.length} className="px-4 py-3">
                  <Skeleton shape="row" />
                </td>
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 ${col.className ?? ''}`}>
                    {col.render
                      ? col.render(row)
                      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        String((row as any)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export type { ThHTMLAttributes };
export default Table;
