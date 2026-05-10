import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ClipboardList, Calendar } from 'lucide-react';
import { getNotes } from '../api/notesApi';

const TYPE_BADGE = {
  meeting: 'bg-primary-50 text-primary-700',
  admin: 'bg-warning-50 text-warning-700',
};

function formatDate(ts) {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function EntityNotes({ entityType, entityId }) {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entityId) return;
    setLoading(true);
    getNotes({ entity_type: entityType, entity_id: entityId })
      .then(r => setNotes(r.data.data || []))
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  if (loading || notes.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-surface-card p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3">Notes</h3>
      <div className="space-y-1">
        {notes.map(note => (
          <button
            key={note.id}
            onClick={() => navigate(`/notes/${note.id}`)}
            className="w-full text-left rounded-lg px-3 py-2.5 hover:bg-surface transition-colors"
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[note.note_type] || 'bg-surface text-text-secondary'}`}>
                {note.note_type === 'admin' ? <ClipboardList size={10} /> : <FileText size={10} />}
                {note.note_type === 'admin' ? 'Admin' : 'Meeting'}
              </span>
              {note.note_date && (
                <span className="flex items-center gap-1 text-xs text-text-secondary">
                  <Calendar size={11} />
                  {formatDate(note.note_date)}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-text-primary leading-snug">{note.note_title}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
