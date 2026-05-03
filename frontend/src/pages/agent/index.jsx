import { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Trash2, Loader2, TriangleAlert } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendChatMessage } from '../../api/agentApi';
import { useAuth } from '../../hooks/useAuth';

function Message({ msg }) {
  const isUser = msg.role === 'user';
  const isError = msg.role === 'error';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-primary-500' : isError ? 'bg-error-500/15' : 'bg-surface border border-border'
      }`}>
        {isUser
          ? <User size={15} className="text-white" />
          : isError
            ? <TriangleAlert size={15} className="text-error-500" />
            : <Bot size={15} className="text-primary-500" />
        }
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isUser
          ? 'bg-primary-500 text-white rounded-tr-sm'
          : isError
            ? 'bg-error-50 text-error-700 border border-error-200 rounded-tl-sm'
            : 'bg-surface-card border border-border text-text-primary rounded-tl-sm'
      }`}>
        {isUser || isError ? (
          <span className="whitespace-pre-wrap">{msg.content}</span>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              code: ({ inline, children }) => inline
                ? <code className="px-1 py-0.5 rounded bg-black/10 font-mono text-xs">{children}</code>
                : <pre className="mt-1 mb-2 p-3 rounded-lg bg-black/10 font-mono text-xs overflow-x-auto whitespace-pre"><code>{children}</code></pre>,
              table: ({ children }) => <div className="overflow-x-auto mb-2"><table className="text-xs border-collapse w-full">{children}</table></div>,
              th: ({ children }) => <th className="border border-border px-2 py-1 text-left font-semibold bg-black/5">{children}</th>,
              td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
              a: ({ href, children }) => <a href={href} className="underline opacity-80 hover:opacity-100" target="_blank" rel="noopener noreferrer">{children}</a>,
              h1: ({ children }) => <h1 className="text-base font-bold mb-1 mt-2 first:mt-0">{children}</h1>,
              h2: ({ children }) => <h2 className="text-sm font-bold mb-1 mt-2 first:mt-0">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-1.5 first:mt-0">{children}</h3>,
              blockquote: ({ children }) => <blockquote className="border-l-2 border-current opacity-70 pl-3 my-1">{children}</blockquote>,
              hr: () => <hr className="my-2 border-current opacity-20" />,
            }}
          >
            {msg.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center">
        <Bot size={15} className="text-primary-500" />
      </div>
      <div className="bg-surface-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function AgentPage() {
  const { role } = useAuth();
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    const userMsg = { role: 'user', content: msg };
    setHistory(h => [...h, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendChatMessage(msg, history.filter(m => m.role !== 'error'));
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clear = () => {
    setHistory([]);
    inputRef.current?.focus();
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
        {!isEmpty && (
          <button
            onClick={clear}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface hover:text-error-500 border border-border transition-colors"
          >
            <Trash2 size={13} /> Clear
          </button>
        )}
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
              {[
                'How many active projects are there?',
                'Which country has the most projects?',
                'Show me the top 5 budgets',
                'List all divisions',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-surface-card hover:border-primary-400 hover:text-primary-600 text-text-secondary transition-colors"
                >
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
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about your data… (Enter to send, Shift+Enter for newline)"
            rows={1}
            disabled={loading}
            className="w-full resize-none rounded-xl border border-border bg-surface-card px-4 py-3 pr-12 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-primary-500 transition-colors disabled:opacity-60"
            style={{ maxHeight: '120px', overflowY: 'hidden' }}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
        </div>
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="shrink-0 w-11 h-11 mt-0.5 rounded-xl bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Send"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
      <p className="mt-1.5 text-center text-xs text-text-secondary/60">
        Powered by Ollama · data is read-only
      </p>
    </div>
  );
}
