import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { createNote } from '../../api/notesApi';
import Card from '../../commoncomponents/Card';

export default function NoteFormPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ note_title: '', note_type: 'meeting', note_date: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.note_title.trim()) { setError('Title is required'); return; }
    setSubmitting(true);
    try {
      const payload = {
        note_title: form.note_title.trim(),
        note_type: form.note_type,
        note_date: form.note_date ? new Date(form.note_date).getTime() : null,
        content: '',
        entities: [],
      };
      const res = await createNote(payload);
      navigate(`/notes/${res.data.data.id}`);
    } catch {
      setError('Failed to create note');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/notes')} className="p-1.5 rounded-lg hover:bg-surface transition-colors text-text-secondary hover:text-text-primary">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-text-primary">New Note</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600">{error}</div>}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Title <span className="text-error-500">*</span></label>
            <input
              type="text"
              required
              value={form.note_title}
              onChange={e => setForm(f => ({ ...f, note_title: e.target.value }))}
              className="w-full rounded-xl border border-border-dark bg-surface px-4 py-3 text-base outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              placeholder="e.g. Weekly sync with TEC division"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Type</label>
            <div className="flex gap-3">
              {[{ value: 'meeting', label: 'Meeting Note' }, { value: 'admin', label: 'Admin' }].map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="note_type"
                    value={opt.value}
                    checked={form.note_type === opt.value}
                    onChange={() => setForm(f => ({ ...f, note_type: opt.value }))}
                    className="accent-primary-500"
                  />
                  <span className="text-sm text-text-primary">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Date</label>
            <input
              type="date"
              value={form.note_date}
              onChange={e => setForm(f => ({ ...f, note_date: e.target.value }))}
              className="w-full rounded-lg border border-border-dark bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => navigate('/notes')} className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium hover:bg-surface transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60 transition-colors">
              {submitting ? 'Creating…' : 'Create & Edit'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
