import { useState, useEffect, useCallback } from 'react';
import { Brain, CheckCircle, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import Card from '../../../commoncomponents/Card';
import {
  getRagSettings,
  saveRagSettings,
  getRagHealth,
  runRagLearning,
} from '../../../api/ragApi';

function fmtDate(ts) {
  if (!ts) return 'never';
  return new Date(ts).toLocaleString('en-GB');
}

export default function RagLearningCard() {
  const [model, setModel] = useState('embeddinggemma');
  const [ollamaUrl, setOllamaUrl] = useState('');
  const [lastRun, setLastRun] = useState(null);
  const [lastStatus, setLastStatus] = useState(null);
  const [chunkCount, setChunkCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [health, setHealth] = useState(null);
  const [checking, setChecking] = useState(false);

  const [learning, setLearning] = useState(false);
  const [learnResult, setLearnResult] = useState(null);
  const [learnError, setLearnError] = useState('');

  const applySettings = (d) => {
    setModel(d.embeddingModel || 'embeddinggemma');
    setOllamaUrl(d.ollamaUrl || '');
    setLastRun(d.lastRun);
    setLastStatus(d.lastStatus);
    setChunkCount(d.chunkCount || 0);
  };

  const checkHealth = useCallback(async () => {
    setChecking(true);
    try {
      const r = await getRagHealth();
      setHealth(r.data.data);
    } catch {
      setHealth({ ollamaAvailable: false, modelAvailable: false, models: [] });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    getRagSettings()
      .then(r => applySettings(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    checkHealth();
  }, [checkHealth]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const r = await saveRagSettings({ embeddingModel: model });
      applySettings(r.data.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await checkHealth();
    } catch {
      // surfaced via health re-check
    } finally {
      setSaving(false);
    }
  };

  const handleLearn = async () => {
    setLearning(true);
    setLearnResult(null);
    setLearnError('');
    try {
      const r = await runRagLearning();
      setLearnResult(r.data.data);
      const s = await getRagSettings();
      applySettings(s.data.data);
    } catch (err) {
      setLearnError(err.response?.data?.error || 'Learning phase failed');
    } finally {
      setLearning(false);
    }
  };

  const inputClass = 'w-full rounded-lg border border-border-dark px-3 py-2 text-sm outline-none focus:border-primary-500 bg-surface';
  const labelClass = 'mb-1.5 block text-sm font-medium text-text-primary';

  const ready = health?.ollamaAvailable && health?.modelAvailable;

  if (loading) {
    return (
      <Card title="Knowledge Learning (RAG)">
        <p className="text-sm text-text-secondary">Loading…</p>
      </Card>
    );
  }

  const StatusRow = ({ ok, label, detail }) => (
    <div className="flex items-center gap-2 text-sm">
      {ok
        ? <CheckCircle size={16} className="text-green-500 shrink-0" />
        : <XCircle size={16} className="text-red-500 shrink-0" />}
      <span className="text-text-primary">{label}</span>
      {detail && <span className="text-text-secondary">— {detail}</span>}
    </div>
  );

  return (
    <Card title="Knowledge Learning (RAG)">
      <div className="flex items-start gap-3 mb-4">
        <Brain size={18} className="mt-0.5 text-text-secondary shrink-0" />
        <p className="text-sm text-text-secondary">
          Build a local embedding index from meeting notes and all project data using an
          Ollama embedding model. Run a <strong>learning phase</strong> whenever the data
          changes so the AI assistant can retrieve relevant context.
        </p>
      </div>

      {/* Health check */}
      <div className="rounded-lg border border-border p-3 mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary">Environment check</span>
          <button
            type="button"
            onClick={checkHealth}
            disabled={checking}
            className="flex items-center gap-1 text-xs text-primary-600 hover:underline disabled:opacity-60"
          >
            <RefreshCw size={12} className={checking ? 'animate-spin' : ''} />
            Re-check
          </button>
        </div>
        <StatusRow
          ok={!!health?.ollamaAvailable}
          label="Ollama running"
          detail={health?.ollamaAvailable ? ollamaUrl : 'not reachable'}
        />
        <StatusRow
          ok={!!health?.modelAvailable}
          label={`Embedding model "${model}"`}
          detail={health?.modelAvailable ? 'available' : 'not pulled — run `ollama pull ' + model + '`'}
        />
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className={labelClass}>Embedding model</label>
          <input
            type="text"
            value={model}
            onChange={e => setModel(e.target.value)}
            placeholder="embeddinggemma"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-text-secondary">
            Ollama model tag used to embed the corpus (e.g. <span className="font-mono">embeddinggemma</span>, <span className="font-mono">gemma3n:e4b</span>).
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save model'}
          </button>

          <button
            type="button"
            onClick={handleLearn}
            disabled={learning || !ready}
            title={ready ? '' : 'Ollama and the embedding model must be available first'}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {learning ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
            {learning ? 'Learning…' : 'Start Learning Phase'}
          </button>
        </div>
      </form>

      {/* Last run / status */}
      <div className="mt-4 border-t border-border pt-3 text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-text-secondary">Indexed chunks</span>
          <span className="font-medium text-text-primary">{chunkCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Last run</span>
          <span className="font-medium text-text-primary">{fmtDate(lastRun)}</span>
        </div>
        {lastStatus && (
          <div className="flex justify-between gap-4">
            <span className="text-text-secondary">Status</span>
            <span className={`font-medium text-right ${/error/i.test(lastStatus) ? 'text-red-500' : 'text-text-primary'}`}>
              {lastStatus}
            </span>
          </div>
        )}
      </div>

      {learnResult && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle size={16} className="mt-0.5 shrink-0" />
          <span>
            Learning complete — {learnResult.chunks} chunks from {learnResult.sources} sources
            {typeof learnResult.durationMs === 'number' && ` in ${(learnResult.durationMs / 1000).toFixed(1)}s`}.
          </span>
        </div>
      )}

      {learnError && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <XCircle size={16} className="mt-0.5 shrink-0" />
          <span>{learnError}</span>
        </div>
      )}
    </Card>
  );
}
