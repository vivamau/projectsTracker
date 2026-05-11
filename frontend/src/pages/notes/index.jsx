import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, FileText, ClipboardList, Calendar, Tag, X, Trash2 } from 'lucide-react';
import { getNotes, deleteNote } from '../../api/notesApi';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';

const TYPE_TABS = [
  { key: '', label: 'All' },
  { key: 'meeting', label: 'Meeting Notes' },
  { key: 'admin', label: 'Admin' },
];

const TYPE_BADGE = {
  meeting: 'bg-primary-50 text-primary-700',
  admin: 'bg-warning-50 text-warning-700',
};

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function NotesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = searchParams.get('type') || '';
  const dateParam = searchParams.get('date') || '';

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmNote, setConfirmNote] = useState(null);

  const clearDateFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('date');
    setSearchParams(next);
  };

  const handleDelete = async () => {
    if (!confirmNote) return;
    await deleteNote(confirmNote.id);
    setNotes(prev => prev.filter(n => n.id !== confirmNote.id));
    setConfirmNote(null);
  };

  function formatDateParam(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  useEffect(() => {
    setLoading(true);
    getNotes({ type: typeParam || undefined, search: search || undefined, date: dateParam || undefined })
      .then(r => setNotes(r.data.data))
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [typeParam, search, dateParam]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Notes</h1>
          <p className="text-sm text-text-secondary mt-0.5">Meeting notes and admin documents</p>
        </div>
        <button
          onClick={() => navigate('/notes/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
        >
          <Plus size={16} /> New Note
        </button>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {TYPE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setSearchParams(tab.key ? { type: tab.key } : {}); }}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${typeParam === tab.key ? 'bg-primary-500 text-white' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search notes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-56 rounded-lg border border-border-dark bg-surface pl-8 pr-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Active date filter chip */}
      {dateParam && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
            <Calendar size={12} />
            {formatDateParam(dateParam)}
            <button onClick={clearDateFilter} className="ml-0.5 hover:text-primary-900 transition-colors">
              <X size={11} />
            </button>
          </span>
        </div>
      )}

      {/* Notes grid */}
      {loading ? (
        <LoadingSpinner size="lg" className="mt-20" />
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <FileText size={40} className="mb-3 opacity-30" />
          <p className="font-medium">No notes yet</p>
          <p className="text-sm mt-1">Create your first note to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map(note => (
            <div
              key={note.id}
              className="group relative rounded-xl border border-border bg-surface-card p-5 shadow-sm hover:border-primary-300 hover:shadow-md transition-all cursor-pointer"
              onClick={() => navigate(`/notes/${note.id}`)}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[note.note_type] || 'bg-surface text-text-secondary'}`}>
                  {note.note_type === 'admin' ? <ClipboardList size={10} /> : <FileText size={10} />}
                  {note.note_type === 'admin' ? 'Admin' : 'Meeting'}
                </span>
                <div className="flex items-center gap-2">
                  {note.note_date && (
                    <span className="flex items-center gap-1 text-xs text-text-secondary">
                      <Calendar size={11} />
                      {formatDate(note.note_date)}
                    </span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmNote(note); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-secondary hover:text-error-500 transition-all"
                    title="Delete note"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-text-primary leading-snug line-clamp-2">{note.note_title}</h3>
              {note.entity_count > 0 && (
                <p className="mt-2 flex items-center gap-1 text-xs text-text-secondary">
                  <Tag size={11} />
                  {note.entity_count} linked {note.entity_count === 1 ? 'entity' : 'entities'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!confirmNote}
        onClose={() => setConfirmNote(null)}
        onConfirm={handleDelete}
        title="Delete Note"
        message={`Are you sure you want to delete "${confirmNote?.note_title}"? The file will be preserved on disk.`}
      />
    </div>
  );
}
