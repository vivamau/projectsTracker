import { useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Bold, Italic, Heading2, List, Link } from 'lucide-react';
import MentionDropdown from './MentionDropdown';
import getCaretCoordinates from 'textarea-caret';

function insertAround(textarea, before, after = before) {
  const { selectionStart: s, selectionEnd: e, value } = textarea;
  const selected = value.slice(s, e) || 'text';
  const newVal = value.slice(0, s) + before + selected + after + value.slice(e);
  return { value: newVal, cursor: s + before.length + selected.length + after.length };
}

function insertAtCursor(textarea, text) {
  const { selectionStart: s, value } = textarea;
  return { value: value.slice(0, s) + text + value.slice(s), cursor: s + text.length };
}

function detectMention(value, cursor) {
  const before = value.slice(0, cursor);
  const match = before.match(/\[\[([^\]\n]*)$/);
  return match ? match[1] : null;
}

export default function MdEditor({ value = '', onChange, placeholder = 'Write in Markdown…', minHeight = 300, onMentionAdded, footer, initialMode = 'edit' }) {
  const [mode, setMode] = useState(initialMode);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionAnchorRect, setMentionAnchorRect] = useState(null);
  const textareaRef = useRef(null);
  const navigate = useNavigate();

  const applyFormat = useCallback((before, after = before) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { value: newVal, cursor } = insertAround(ta, before, after);
    onChange(newVal);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(cursor, cursor); });
  }, [onChange]);

  const handleChange = (e) => {
    const ta = e.target;
    onChange(ta.value);
    const cursor = ta.selectionStart;
    const query = detectMention(ta.value, cursor);
    if (query !== null) {
      const coords = getCaretCoordinates(ta, cursor);
      const rect = ta.getBoundingClientRect();
      setMentionAnchorRect({
        bottom: rect.top + coords.top + coords.height - ta.scrollTop,
        left: rect.left + coords.left,
      });
      setMentionQuery(query);
    } else {
      setMentionQuery(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      const { value: newVal, cursor } = insertAtCursor(ta, '  ');
      onChange(newVal);
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(cursor, cursor); });
    }
  };

  const handleMentionSelect = (item) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart;
    const before = value.slice(0, cursor);
    const queryStart = before.lastIndexOf('[[');
    const insertion = item.url ? `[${item.label}](${item.url})` : item.label;
    const newVal = value.slice(0, queryStart) + insertion + value.slice(cursor);
    onChange(newVal);
    setMentionQuery(null);
    if (item.type !== 'date' && onMentionAdded) onMentionAdded(item);
    requestAnimationFrame(() => ta.focus());
  };

  const toolbarBtn = (icon, title, action) => (
    <button
      key={title}
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); action(); }}
      className="p-1.5 rounded hover:bg-surface text-text-secondary hover:text-text-primary transition-colors"
    >
      {icon}
    </button>
  );

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-2 py-1">
        <div className="flex items-center gap-0.5">
          {toolbarBtn(<Bold size={14} />, 'Bold', () => applyFormat('**'))}
          {toolbarBtn(<Italic size={14} />, 'Italic', () => applyFormat('_'))}
          {toolbarBtn(<Heading2 size={14} />, 'Heading', () => applyFormat('## ', ''))}
          {toolbarBtn(<List size={14} />, 'Bullet list', () => applyFormat('- ', ''))}
          {toolbarBtn(<Link size={14} />, 'Link', () => applyFormat('[', '](url)'))}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${mode === 'edit' ? 'bg-primary-500 text-white' : 'text-text-secondary hover:bg-surface-card'}`}
          >
            <Pencil size={12} /> Edit
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${mode === 'preview' ? 'bg-primary-500 text-white' : 'text-text-secondary hover:bg-surface-card'}`}
          >
            <Eye size={12} /> Preview
          </button>
        </div>
      </div>

      {/* Body */}
      {mode === 'edit' ? (
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            style={{ minHeight }}
            className="w-full resize-y bg-surface-card px-4 py-3 text-sm font-mono text-text-primary outline-none placeholder:text-text-secondary"
          />
          {mentionQuery !== null && (
            <MentionDropdown
              query={mentionQuery}
              anchorRect={mentionAnchorRect}
              onSelect={handleMentionSelect}
              onClose={() => setMentionQuery(null)}
            />
          )}
        </div>
      ) : (
        <div
          className="prose prose-sm max-w-none px-4 py-3 bg-surface-card text-text-primary"
          style={{ minHeight }}
        >
          {value ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => {
                  const isInternal = href && href.startsWith('/');
                  if (isInternal) {
                    return (
                      <button
                        onClick={() => navigate(href)}
                        className="text-primary-500 hover:underline cursor-pointer bg-transparent border-0 p-0 font-inherit text-inherit"
                      >
                        {children}
                      </button>
                    );
                  }
                  return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
                }
              }}
            >
              {value}
            </ReactMarkdown>
          ) : (
            <p className="text-text-secondary italic">{placeholder}</p>
          )}
        </div>
      )}
      {footer && (
        <div className="border-t border-border bg-surface px-3 py-2 flex justify-end">
          {footer}
        </div>
      )}
    </div>
  );
}
