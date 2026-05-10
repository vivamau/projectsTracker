import { useEffect, useState, useRef } from 'react';
import { getMentions } from '../api/notesApi';

const TYPE_LABELS = {
  date: 'Date',
  project: 'Projects',
  division: 'Divisions',
  initiative: 'Initiatives',
  vendor: 'Vendors',
  user: 'People',
  country: 'Countries',
};

function parseDateQuery(query) {
  const match = query.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match.map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function formatDateLabel(date) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function toDateUrl(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `/notes?date=${y}-${m}-${d}`;
}

export default function MentionDropdown({ query, anchorRect, onSelect, onClose }) {
  const [results, setResults] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const listRef = useRef(null);

  useEffect(() => {
    if (!query && query !== '') { setResults([]); return; }

    // Date: purely local — no API call needed
    const parsedDate = parseDateQuery(query);
    if (parsedDate) {
      setResults([{ type: 'date', id: `date-${query}`, label: formatDateLabel(parsedDate), url: toDateUrl(parsedDate) }]);
      setActiveIdx(0);
      return;
    }

    // Entity search with debounce
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await getMentions(query);
        if (!cancelled) { setResults(res.data.data || []); setActiveIdx(0); }
      } catch { if (!cancelled) setResults([]); }
    }, 150);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && results[activeIdx]) { e.preventDefault(); onSelect(results[activeIdx]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [results, activeIdx, onSelect, onClose]);

  if (!results.length) return null;

  const grouped = results.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  const style = anchorRect ? {
    position: 'fixed',
    top: anchorRect.bottom + 4,
    left: anchorRect.left,
    zIndex: 9999,
  } : { position: 'fixed', top: 100, left: 100, zIndex: 9999 };

  let flatIdx = 0;

  return (
    <div
      ref={listRef}
      style={style}
      className="w-72 rounded-lg border border-border bg-surface-card shadow-xl overflow-hidden"
    >
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type}>
          <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-secondary bg-surface">
            {TYPE_LABELS[type] || type}
          </p>
          {items.map((item) => {
            const idx = flatIdx++;
            return (
              <button
                key={`${item.type}-${item.id}`}
                onMouseDown={(e) => { e.preventDefault(); onSelect(item); }}
                className={`w-full text-left px-3 py-1.5 text-sm truncate transition-colors ${idx === activeIdx ? 'bg-primary-50 text-primary-700' : 'hover:bg-surface text-text-primary'}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
