import { Search } from 'lucide-react';

export default function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border-dark bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
      />
    </div>
  );
}
