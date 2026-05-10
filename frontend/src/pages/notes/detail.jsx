import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Save, Trash2, Plus, X, Search, Sparkles } from 'lucide-react';
import { getNote, getNoteContent, updateNote, deleteNote, getMentions, aiExtractNote } from '../../api/notesApi';
import MdEditor from '../../commoncomponents/MdEditor';
import ConfirmDialog from '../../commoncomponents/ConfirmDialog';
import LoadingSpinner from '../../commoncomponents/LoadingSpinner';

const TYPE_BADGE = {
  meeting: 'bg-primary-50 text-primary-700',
  admin: 'bg-warning-50 text-warning-700',
};

const ENTITY_COLORS = {
  project: 'bg-blue-50 text-blue-700',
  division: 'bg-purple-50 text-purple-700',
  initiative: 'bg-green-50 text-green-700',
  vendor: 'bg-orange-50 text-orange-700',
  user: 'bg-teal-50 text-teal-700',
  country: 'bg-rose-50 text-rose-700',
};

const ENTITY_URLS = {
  project: (id) => `/projects/${id}`,
  division: (id) => `/divisions/${id}`,
  initiative: (id) => `/initiatives/${id}`,
  vendor: (id) => `/vendors/${id}`,
  user: (id) => `/users/${id}`,
  country: (id) => `/countries/${id}`,
};

function tsToInput(ts) {
  if (!ts) return '';
  return new Date(ts).toISOString().split('T')[0];
}

export default function NoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [note, setNote] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [noteType, setNoteType] = useState('meeting');
  const [noteDate, setNoteDate] = useState('');
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [entitySearch, setEntitySearch] = useState('');
  const [entityResults, setEntityResults] = useState([]);
  const [showEntitySearch, setShowEntitySearch] = useState(false);

  useEffect(() => {
    Promise.all([getNote(id), getNoteContent(id)])
      .then(([metaRes, contentRes]) => {
        const n = metaRes.data.data;
        setNote(n);
        setTitle(n.note_title);
        setNoteType(n.note_type);
        setNoteDate(tsToInput(n.note_date));
        setEntities(n.entities || []);
        setContent(typeof contentRes.data === 'string' ? contentRes.data : '');
      })
      .catch(() => navigate('/notes'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNote(id, {
        note_title: title.trim() || note.note_title,
        note_type: noteType,
        note_date: noteDate ? new Date(noteDate).getTime() : null,
        entities: entities.map(e => ({ entity_type: e.entity_type, entity_id: e.entity_id })),
        content,
      });
      navigate('/notes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await deleteNote(id);
    navigate('/notes');
  };

  const handleEntitySearch = useCallback(async (q) => {
    setEntitySearch(q);
    if (!q.trim()) { setEntityResults([]); return; }
    try {
      const res = await getMentions(q);
      setEntityResults(res.data.data || []);
    } catch { setEntityResults([]); }
  }, []);

  const addEntity = (item) => {
    if (entities.find(e => e.entity_type === item.type && e.entity_id === String(item.id))) return;
    setEntities(prev => [...prev, { entity_type: item.type, entity_id: String(item.id), entity_label: item.label }]);
    setEntitySearch('');
    setEntityResults([]);
  };

  const handleAiExtract = async () => {
    setExtracting(true);
    try {
      const res = await aiExtractNote(id, content);
      const { content: newContent, entities: newEntities } = res.data.data;
      setContent(newContent);
      setEntities(prev => {
        const merged = [...prev];
        for (const e of newEntities) {
          if (!merged.find(x => x.entity_type === e.type && x.entity_id === String(e.id))) {
            merged.push({ entity_type: e.type, entity_id: String(e.id), entity_label: e.label });
          }
        }
        return merged;
      });
    } catch (err) {
      alert(err?.response?.data?.message || 'AI extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  const handleMentionAdded = (item) => {
    setEntities(prev => {
      if (prev.find(e => e.entity_type === item.type && e.entity_id === String(item.id))) return prev;
      return [...prev, { entity_type: item.type, entity_id: String(item.id), entity_label: item.label }];
    });
  };

  const removeEntity = (entity_type, entity_id) => {
    setEntities(prev => prev.filter(e => !(e.entity_type === entity_type && e.entity_id === entity_id)));
  };

  if (loading) return <LoadingSpinner size="lg" className="mt-20" />;

  return (
    <div className="space-y-4">
      {/* Top bar — same 3/4 + 1/4 split as the editor below */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Title + meta (3/4) */}
        <div className="lg:col-span-3 space-y-2">
          <div className="flex items-center gap-3">
            <select
              value={noteType}
              onChange={e => setNoteType(e.target.value)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium border-0 outline-none cursor-pointer appearance-none ${TYPE_BADGE[noteType]}`}
            >
              <option value="meeting">Meeting</option>
              <option value="admin">Admin</option>
            </select>
            <input
              type="date"
              value={noteDate}
              onChange={e => setNoteDate(e.target.value)}
              className="rounded-lg border border-border-dark bg-surface px-2 py-1 text-xs outline-none focus:border-primary-500 appearance-none"
            />
          </div>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-xl border border-border-dark bg-surface px-4 py-2 text-xl font-bold outline-none focus:border-primary-500 text-text-primary placeholder:text-text-secondary"
            placeholder="Note title"
          />
        </div>

        {/* Actions (1/4) */}
        <div className="flex items-start justify-end gap-2">
          <button
            onClick={handleSave}
            disabled={saving || extracting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60 transition-colors"
          >
            <Save size={14} /> {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-error-500 px-3 py-2 text-sm font-medium text-error-500 hover:bg-error-50 transition-colors"
          >
            <Trash2 size={15} /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Editor — main column */}
        <div className="lg:col-span-3">
          <MdEditor
            value={content}
            onChange={setContent}
            minHeight={500}
            placeholder="Start writing… type [[ to mention an entity"
            onMentionAdded={handleMentionAdded}
            initialMode="preview"
            footer={
              <button
                onClick={handleAiExtract}
                disabled={extracting || saving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary-300 px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 disabled:opacity-60 transition-colors"
                title="AI: extract entity links from note content"
              >
                <Sparkles size={14} /> {extracting ? 'Extracting…' : 'AI Extract'}
              </button>
            }
          />
        </div>

        {/* Sidebar — entity associations */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-primary">Linked Entities</h3>
              <button
                onClick={() => setShowEntitySearch(v => !v)}
                className="p-1 rounded text-text-secondary hover:text-primary-500 transition-colors"
                title="Add entity"
              >
                <Plus size={14} />
              </button>
            </div>

            {showEntitySearch && (
              <div className="mb-3">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    type="text"
                    autoFocus
                    value={entitySearch}
                    onChange={e => handleEntitySearch(e.target.value)}
                    placeholder="Search projects, people…"
                    className="w-full rounded-lg border border-border-dark bg-surface pl-7 pr-3 py-1.5 text-xs outline-none focus:border-primary-500"
                  />
                </div>
                {entityResults.length > 0 && (
                  <div className="mt-1 rounded-lg border border-border bg-surface-card shadow-md max-h-48 overflow-y-auto">
                    {entityResults.map(item => (
                      <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => addEntity(item)}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface transition-colors"
                      >
                        <span className="text-text-secondary capitalize">{item.type}:</span>{' '}
                        <span className="text-text-primary">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {entities.length === 0 ? (
              <p className="text-xs text-text-secondary">No entities linked yet</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {entities.map(e => {
                  const url = ENTITY_URLS[e.entity_type]?.(e.entity_id);
                  const colorClass = ENTITY_COLORS[e.entity_type] || 'bg-surface text-text-secondary';
                  return (
                    <span
                      key={`${e.entity_type}-${e.entity_id}`}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
                    >
                      {url ? (
                        <Link to={url} className="hover:underline" onClick={e2 => e2.stopPropagation()}>
                          {e.entity_label || `${e.entity_type} #${e.entity_id}`}
                        </Link>
                      ) : (
                        <span>{e.entity_label || `${e.entity_type} #${e.entity_id}`}</span>
                      )}
                      <button onClick={() => removeEntity(e.entity_type, e.entity_id)} className="hover:text-error-500 transition-colors ml-0.5">
                        <X size={10} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Note"
        message={`Are you sure you want to delete "${note?.note_title}"? The file will be preserved on disk.`}
      />
    </div>
  );
}
