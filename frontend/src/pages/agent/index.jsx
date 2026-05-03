import { useState, useRef, useEffect, useCallback } from 'react';
import { useBlocker } from 'react-router-dom';
import { Bot, User, Send, Trash2, Loader2, TriangleAlert, BookmarkPlus, FolderOpen, Download, X, Check, FilePlus, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendChatMessage, saveAgentSession, listAgentSessions, loadAgentSession, downloadAgentSession, deleteAgentSession } from '../../api/agentApi';
import { useAuth } from '../../hooks/useAuth';

// ─── Message bubble ────────────────────────────────────────────────────────

function Message({ msg }) {
  const isUser  = msg.role === 'user';
  const isError = msg.role === 'error';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-primary-500' : isError ? 'bg-error-500/15' : 'bg-surface border border-border'
      }`}>
        {isUser ? <User size={15} className="text-white" />
          : isError ? <TriangleAlert size={15} className="text-error-500" />
          : <Bot size={15} className="text-primary-500" />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isUser  ? 'bg-primary-500 text-white rounded-tr-sm'
        : isError ? 'bg-error-50 text-error-700 border border-error-200 rounded-tl-sm'
        : 'bg-surface-card border border-border text-text-primary rounded-tl-sm'
      }`}>
        {isUser || isError ? (
          <span className="whitespace-pre-wrap">{msg.content}</span>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
            p:          ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            strong:     ({ children }) => <strong className="font-semibold">{children}</strong>,
            em:         ({ children }) => <em className="italic">{children}</em>,
            ul:         ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
            ol:         ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
            li:         ({ children }) => <li className="leading-relaxed">{children}</li>,
            code:       ({ inline, children }) => inline
              ? <code className="px-1 py-0.5 rounded bg-black/10 font-mono text-xs">{children}</code>
              : <pre className="mt-1 mb-2 p-3 rounded-lg bg-black/10 font-mono text-xs overflow-x-auto whitespace-pre"><code>{children}</code></pre>,
            table:      ({ children }) => <div className="overflow-x-auto mb-2"><table className="text-xs border-collapse w-full">{children}</table></div>,
            th:         ({ children }) => <th className="border border-border px-2 py-1 text-left font-semibold bg-black/5">{children}</th>,
            td:         ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
            a:          ({ href, children }) => <a href={href} className="underline opacity-80 hover:opacity-100" target="_blank" rel="noopener noreferrer">{children}</a>,
            h1:         ({ children }) => <h1 className="text-base font-bold mb-1 mt-2 first:mt-0">{children}</h1>,
            h2:         ({ children }) => <h2 className="text-sm font-bold mb-1 mt-2 first:mt-0">{children}</h2>,
            h3:         ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-1.5 first:mt-0">{children}</h3>,
            blockquote: ({ children }) => <blockquote className="border-l-2 border-current opacity-70 pl-3 my-1">{children}</blockquote>,
            hr:         () => <hr className="my-2 border-current opacity-20" />,
          }}>
            {msg.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

// ─── Typing indicator ──────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center">
        <Bot size={15} className="text-primary-500" />
      </div>
      <div className="bg-surface-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

// ─── Save-before-leaving modal ─────────────────────────────────────────────

function UnsavedModal({ context, onSave, onDiscard, onCancel }) {
  const isNew = context === 'new';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-xl">
        <h2 className="text-base font-bold text-text-primary mb-1">
          {isNew ? 'Start a new session?' : 'Leave this page?'}
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          You have an unsaved conversation.{' '}
          {isNew ? 'Would you like to save it before starting fresh?' : 'Would you like to save it before leaving?'}
        </p>
        <div className="flex flex-col gap-2">
          <button onClick={onSave}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-600 transition-colors">
            <BookmarkPlus size={15} /> Save session
          </button>
          <button onClick={onDiscard}
            className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors">
            {isNew ? 'Start new without saving' : 'Leave without saving'}
          </button>
          <button onClick={onCancel}
            className="w-full rounded-lg px-4 py-2 text-sm text-text-secondary/70 hover:text-text-secondary transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Save dialog ───────────────────────────────────────────────────────────

function SaveDialog({ defaultTitle, onSave, onClose }) {
  const [title, setTitle] = useState(defaultTitle);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave(title.trim());
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-bold text-text-primary mb-1">Save session</h2>
        <p className="text-xs text-text-secondary mb-4">Saved as a Markdown file you can download any time.</p>
        <label className="block text-xs font-medium text-text-secondary mb-1">Title</label>
        <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()} maxLength={120}
          className="w-full rounded-lg border border-border bg-surface-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 mb-5" />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-hover transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!title.trim() || saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors disabled:opacity-40">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Saved sessions drawer ─────────────────────────────────────────────────

function SavedSessionsDrawer({ onClose, onLoad }) {
  const [sessions, setSessions] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const fetchList = useCallback(async () => {
    try { setSessions((await listAgentSessions()).data.data); }
    catch { setSessions([]); }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleLoad = async (session) => {
    setLoadError(null);
    setLoadingId(session.id);
    try {
      const res = await loadAgentSession(session.id);
      onLoad(res.data.data);
    } catch (err) {
      setLoadError(err.response?.data?.error || 'Failed to load session');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDownload = async (session) => {
    try {
      const res = await downloadAgentSession(session.id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/markdown' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try { await deleteAgentSession(id); setSessions(s => s.filter(x => x.id !== id)); }
    catch { /* silent */ }
    setDeletingId(null);
  };

  const formatDate = (ts) => ts ? new Date(ts).toLocaleString() : '—';

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-sm h-full bg-surface shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FolderOpen size={16} className="text-primary-500" />
            <span className="text-sm font-semibold text-text-primary">Saved sessions</span>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadError && (
            <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-error-50 border border-error-200 text-xs text-error-700 flex items-center gap-2">
              <TriangleAlert size={13} className="shrink-0" />
              <span>{loadError}</span>
              <button onClick={() => setLoadError(null)} className="ml-auto text-error-500 hover:text-error-700"><X size={12} /></button>
            </div>
          )}
          {sessions === null ? (
            <div className="flex items-center justify-center py-16 text-text-secondary text-sm">Loading…</div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-6">
              <FolderOpen size={36} className="text-text-secondary/40" />
              <p className="text-sm text-text-secondary">No saved sessions yet</p>
              <p className="text-xs text-text-secondary/60">Save a conversation using the bookmark button</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {sessions.map(s => (
                <li key={s.id} className="px-5 py-4 hover:bg-surface-hover transition-colors">
                  <div className="mb-2">
                    <p className="text-sm font-medium text-text-primary truncate">{s.title}</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {s.message_count} message{s.message_count !== 1 ? 's' : ''} · {formatDate(s.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleLoad(s)} disabled={loadingId === s.id || !s.can_load}
                      title={s.can_load ? 'Load into chat' : 'Message history unavailable (saved before this feature was enabled)'}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-primary-600 hover:bg-primary-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      {loadingId === s.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                      Load
                    </button>
                    <button onClick={() => handleDownload(s)} title="Download as Markdown"
                      className="p-1.5 rounded-lg text-text-secondary hover:text-primary-500 hover:bg-primary-500/10 transition-colors">
                      <Download size={14} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} disabled={deletingId === s.id} title="Delete"
                      className="p-1.5 rounded-lg text-text-secondary hover:text-error-500 hover:bg-error-500/10 transition-colors disabled:opacity-40">
                      {deletingId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function newSessionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function defaultTitle(history) {
  const first = history.find(m => m.role === 'user');
  const preview = first ? first.content.slice(0, 60) : 'AI Session';
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${date} — ${preview}`;
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AgentPage() {
  const { role } = useAuth();
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(newSessionId);
  const sessionIdRef = useRef(sessionId);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Save UI
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);

  // Unsaved modal — 'new' | 'navigate' | null
  const [unsavedContext, setUnsavedContext] = useState(null);
  // What to do after a successful save (proceed with nav or start new)
  const afterSaveRef = useRef(null);

  const hasConversation = history.some(m => m.role === 'user');

  // Block navigation when there's an unsaved conversation
  const blocker = useBlocker(hasConversation && !sessionSaved);

  // React to the router trying to navigate away
  useEffect(() => {
    if (blocker.state === 'blocked') setUnsavedContext('navigate');
  }, [blocker.state]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setSessionSaved(false);
    setHistory(h => [...h, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);
    try {
      const res = await sendChatMessage(msg, history.filter(m => m.role !== 'error'), sessionIdRef.current);
      setHistory(h => [...h, res.data.data]);
    } catch (err) {
      const detail = err.response?.data?.error || err.message || 'Something went wrong';
      setHistory(h => [...h, { role: 'error', content: detail }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // "New" button — ask only when there's an unsaved conversation
  const handleNew = () => {
    if (!hasConversation || sessionSaved) {
      startNewSession();
    } else {
      setUnsavedContext('new');
    }
  };

  const startNewSession = () => {
    sessionIdRef.current = newSessionId();
    setHistory([]);
    setSessionSaved(false);
    setUnsavedContext(null);
    inputRef.current?.focus();
  };

  // ── Unsaved modal actions ──────────────────────────────────────────────

  const handleUnsavedSave = () => {
    // Store the deferred action, then open save dialog
    if (unsavedContext === 'new') {
      afterSaveRef.current = startNewSession;
    } else if (unsavedContext === 'navigate') {
      afterSaveRef.current = () => { blocker.proceed(); };
    }
    setUnsavedContext(null);
    setSaveDialogOpen(true);
  };

  const handleUnsavedDiscard = () => {
    if (unsavedContext === 'navigate') {
      blocker.proceed();
    } else {
      startNewSession();
    }
    setUnsavedContext(null);
  };

  const handleUnsavedCancel = () => {
    if (unsavedContext === 'navigate') blocker.reset();
    setUnsavedContext(null);
  };

  // ── Load saved session ─────────────────────────────────────────────────

  const handleLoadSession = (sessionData) => {
    sessionIdRef.current = newSessionId();
    setHistory(sessionData.messages || []);
    setSessionSaved(true);
    setDrawerOpen(false);
  };

  // ── Save dialog ────────────────────────────────────────────────────────

  const handleSave = async (title) => {
    try {
      await saveAgentSession({ sessionId: sessionIdRef.current, title, messages: history });
      setSessionSaved(true);
      setSaveDialogOpen(false);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
      // Execute the deferred action (start new / proceed navigation), if any
      if (afterSaveRef.current) {
        afterSaveRef.current();
        afterSaveRef.current = null;
      }
    } catch { /* silent */ }
  };

  const handleSaveDialogClose = () => {
    setSaveDialogOpen(false);
    afterSaveRef.current = null;
    // If navigation was blocked and user cancels the save dialog, reset the blocker
    if (blocker.state === 'blocked') blocker.reset();
  };

  const isEmpty = history.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-500/10 flex items-center justify-center">
            <Bot size={20} className="text-primary-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">AI Assistant</h1>
            <p className="text-xs text-text-secondary">Ask questions about your project data</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface border border-border transition-colors"
            title="My saved sessions">
            <FolderOpen size={13} /> Saved
          </button>
          {hasConversation && !sessionSaved && (
            <button onClick={() => setSaveDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface border border-border transition-colors"
              title="Save this session as Markdown">
              <BookmarkPlus size={13} /> Save
            </button>
          )}
          {!isEmpty && (
            <button onClick={handleNew}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface border border-border transition-colors">
              <FilePlus size={13} /> New
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-surface p-5 space-y-4">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center">
              <Bot size={28} className="text-primary-500" />
            </div>
            <p className="text-sm font-medium text-text-primary">How can I help you?</p>
            <p className="text-xs text-text-secondary max-w-xs">
              Ask me about projects, budgets, divisions, vendors, or any data in the system.
            </p>
            <div className="mt-2 flex flex-wrap gap-2 justify-center">
              {['How many active projects are there?', 'Which country has the most projects?', 'Show me the top 5 budgets', 'List all divisions'].map(q => (
                <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-surface-card hover:border-primary-400 hover:text-primary-600 text-text-secondary transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {history.map((msg, i) => <Message key={i} msg={msg} />)}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <div className="flex-1 relative">
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about your data… (Enter to send, Shift+Enter for newline)"
            rows={1} disabled={loading}
            className="w-full resize-none rounded-xl border border-border bg-surface-card px-4 py-3 pr-12 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-primary-500 transition-colors disabled:opacity-60"
            style={{ maxHeight: '120px', overflowY: 'hidden' }}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
        </div>
        <button onClick={send} disabled={!input.trim() || loading}
          className="shrink-0 w-11 h-11 mt-0.5 rounded-xl bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Send">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
      <p className="mt-1.5 text-center text-xs text-text-secondary/60">
        Powered by Ollama · data is read-only
      </p>

      {/* Unsaved-session modal (New or Navigate away) */}
      {unsavedContext && (
        <UnsavedModal
          context={unsavedContext}
          onSave={handleUnsavedSave}
          onDiscard={handleUnsavedDiscard}
          onCancel={handleUnsavedCancel}
        />
      )}

      {/* Save dialog (z-60 so it sits above the unsaved modal if stacked) */}
      {saveDialogOpen && (
        <SaveDialog
          defaultTitle={defaultTitle(history)}
          onSave={handleSave}
          onClose={handleSaveDialogClose}
        />
      )}

      {/* Saved sessions drawer */}
      {drawerOpen && <SavedSessionsDrawer onClose={() => setDrawerOpen(false)} onLoad={handleLoadSession} />}

      {/* "Saved!" toast */}
      {savedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg bg-surface border border-border px-4 py-2.5 text-sm font-medium shadow-lg">
          <Check size={15} className="text-primary-500" /> Session saved!
        </div>
      )}
    </div>
  );
}
