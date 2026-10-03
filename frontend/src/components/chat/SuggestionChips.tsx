export const DEFAULT_SUGGESTIONS = [
  'Where is the ladies restroom?',
  'Find available classrooms now',
  'CSE Sem 5 timetable',
  'Download DBMS question papers',
  'Show my complaints',
  'Where is CSE-204?',
] as const;

export interface SuggestionChipsProps {
  suggestions?: string[];
  onSelect: (suggestion: string) => void;
}

export function SuggestionChips({
  suggestions = DEFAULT_SUGGESTIONS as unknown as string[],
  onSelect,
}: SuggestionChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" aria-label="Suggested queries">
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSelect(s)}
          className="flex-shrink-0 rounded-full border border-accent-300 bg-accent-50 px-3 py-1.5 text-xs font-medium text-accent-800 hover:bg-accent-100 hover:border-accent-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        >
          {s}
        </button>
      ))}
    </div>
  );
}

export default SuggestionChips;
