import { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText, X, ChevronRight } from 'lucide-react';
import Modal from '../../../commoncomponents/Modal';
import { parseConsumptionReport, applyConsumptionReport } from '../../../api/projectsApi';

const STEPS = ['upload', 'preview', 'done'];

function MonthLabel({ epoch }) {
  if (!epoch) return <span className="text-text-secondary">—</span>;
  return <span>{new Date(epoch).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>;
}

function MatchBadge({ matched }) {
  return matched
    ? <span className="inline-flex items-center gap-1 text-xs text-success-600"><CheckCircle size={12} /> Matched</span>
    : <span className="inline-flex items-center gap-1 text-xs text-warning-600"><AlertCircle size={12} /> Unmatched</span>;
}

export default function ConsumptionReportModal({ projectId, open, onClose, onApplied }) {
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [parseError, setParseError] = useState('');
  const [applyError, setApplyError] = useState('');
  const [preview, setPreview] = useState(null);
  const [entries, setEntries] = useState([]);
  const fileRef = useRef(null);

  const reset = () => {
    setStep('upload');
    setFile(null);
    setParseError('');
    setApplyError('');
    setPreview(null);
    setEntries([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === 'application/pdf') setFile(dropped);
  };

  const handleParse = async () => {
    if (!file) return;
    setParsing(true);
    setParseError('');
    try {
      const res = await parseConsumptionReport(projectId, file);
      const data = res.data.data;
      setPreview(data);
      setEntries(data.suggestions.map(s => ({ ...s })));
      setStep('preview');
    } catch (err) {
      setParseError(err.response?.data?.error || 'Failed to parse the report. Check that it matches the expected format.');
    } finally {
      setParsing(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    setApplyError('');
    try {
      await applyConsumptionReport(projectId, entries);
      setStep('done');
      onApplied?.();
    } catch (err) {
      setApplyError(err.response?.data?.error || 'Failed to apply the report.');
    } finally {
      setApplying(false);
    }
  };

  const updateEntryDays = (idx, value) => {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, consumption_days: parseFloat(value) || 0 } : e));
  };

  return (
    <Modal open={open} onClose={handleClose} title="Upload Consumption Report">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {['Upload', 'Preview', 'Done'].map((label, i) => {
          const current = STEPS.indexOf(step);
          const active = i === current;
          const done = i < current;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold
                ${done ? 'bg-success-500 text-white' : active ? 'bg-primary-500 text-white' : 'bg-surface border border-border text-text-secondary'}`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-xs ${active ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>{label}</span>
              {i < 2 && <ChevronRight size={12} className="text-border" />}
            </div>
          );
        })}
      </div>

      {/* STEP: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div
            className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors
              ${dragOver ? 'border-primary-500 bg-primary-50/20' : 'border-border hover:border-primary-400'}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={e => setFile(e.target.files[0] || null)}
            />
            <Upload size={36} className="mb-3 text-text-secondary" />
            <p className="text-sm font-medium text-text-primary">Drop PDF report here or click to browse</p>
            <p className="mt-1 text-xs text-text-secondary">WFP time-and-materials consumption report (PDF)</p>
          </div>

          {file && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
              <FileText size={16} className="text-primary-500 flex-shrink-0" />
              <span className="flex-1 truncate text-sm text-text-primary">{file.name}</span>
              <button onClick={() => setFile(null)} className="text-text-secondary hover:text-error-500 transition-colors">
                <X size={14} />
              </button>
            </div>
          )}

          {parseError && (
            <p className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-600">{parseError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={handleClose} className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
              Cancel
            </button>
            <button
              onClick={handleParse}
              disabled={!file || parsing}
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {parsing ? 'Parsing…' : 'Parse Report'}
            </button>
          </div>
        </div>
      )}

      {/* STEP: Preview */}
      {step === 'preview' && preview && (
        <div className="space-y-5">
          {/* Summary */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Extracted Data</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <span className="text-text-secondary">PO Number</span>
              <span className="font-mono font-medium text-text-primary">{preview.parsed.poNumber || '—'}</span>
              <span className="text-text-secondary">Vendor</span>
              <span className="text-text-primary">{preview.parsed.vendorName || '—'}</span>
              <span className="text-text-secondary">Project</span>
              <span className="text-text-primary">{preview.parsed.projectName || '—'}</span>
              <span className="text-text-secondary">Period</span>
              <span className="text-text-primary"><MonthLabel epoch={preview.parsed.periodEpoch} /></span>
              <span className="text-text-secondary">Days this period</span>
              <span className="font-semibold text-text-primary">{preview.parsed.daysConsumed ?? '—'}</span>
              <span className="text-text-secondary">PO Amount</span>
              <span className="text-text-primary">
                {preview.parsed.currency} {preview.parsed.poAmount?.toLocaleString() ?? '—'}
              </span>
            </div>
          </div>

          {/* PO Match Status */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">PO Match</p>
            {preview.matchedPO
              ? <p className="flex items-center gap-2 text-sm text-success-600">
                  <CheckCircle size={15} /> Found: {preview.matchedPO.purchaseorder_description}
                </p>
              : <p className="flex items-center gap-2 text-sm text-warning-600">
                  <AlertCircle size={15} /> No PO matching "{preview.parsed.poNumber}" found in the database. Entries cannot be applied.
                </p>
            }
          </div>

          {/* Entries to apply */}
          {entries.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary bg-surface border-b border-border">
                Consumption Entries to Apply
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/50">
                    <th className="px-4 py-2 text-left text-xs text-text-secondary font-medium">Resource</th>
                    <th className="px-4 py-2 text-left text-xs text-text-secondary font-medium">Period</th>
                    <th className="px-4 py-2 text-right text-xs text-text-secondary font-medium">Days</th>
                    <th className="px-4 py-2 text-left text-xs text-text-secondary font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => {
                    const item = preview.items.find(i => i.id === entry.purchaseorderitem_id);
                    return (
                      <tr key={idx} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-text-primary">{entry.resource_name}</p>
                          <p className="text-xs text-text-secondary">{entry.role}</p>
                        </td>
                        <td className="px-4 py-2.5 text-text-secondary">
                          <MonthLabel epoch={entry.consumption_month} />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={entry.consumption_days}
                            onChange={e => updateEntryDays(idx, e.target.value)}
                            className="w-16 rounded border border-border bg-surface px-2 py-0.5 text-right text-sm text-text-primary focus:border-primary-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <MatchBadge matched={!!item} />
                          {item && (
                            <p className="text-xs text-text-secondary mt-0.5">
                              {item.total_days_consumed}/{item.purchaseorderitems_days} days used
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {preview.unmatched?.length > 0 && (
            <div className="rounded-lg bg-warning-50 px-3 py-2 text-sm text-warning-700">
              <strong>{preview.unmatched.length}</strong> resource(s) could not be matched to a PO item:{' '}
              {preview.unmatched.map(r => r.fullName).join(', ')}
            </div>
          )}

          {applyError && (
            <p className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-600">{applyError}</p>
          )}

          <div className="flex justify-between gap-2 pt-2">
            <button onClick={() => setStep('upload')} className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
              ← Back
            </button>
            <div className="flex gap-2">
              <button onClick={handleClose} className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={applying || !preview.matchedPO || entries.length === 0}
                className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                {applying ? 'Applying…' : `Apply ${entries.length} ${entries.length === 1 ? 'Entry' : 'Entries'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP: Done */}
      {step === 'done' && (
        <div className="flex flex-col items-center py-8 gap-4">
          <CheckCircle size={48} className="text-success-500" />
          <p className="text-lg font-semibold text-text-primary">Consumption recorded</p>
          <p className="text-sm text-text-secondary text-center">
            {entries.length} consumption {entries.length === 1 ? 'entry' : 'entries'} applied to the PO balance.
          </p>
          <button onClick={handleClose} className="rounded-lg bg-primary-500 px-6 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors">
            Close
          </button>
        </div>
      )}
    </Modal>
  );
}
