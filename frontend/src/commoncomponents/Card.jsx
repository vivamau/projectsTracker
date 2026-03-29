export default function Card({ children, className = '', title, extra, noPadding = false }) {
  return (
    <div className={`rounded-lg bg-surface-card border border-border shadow-sm ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
          {extra && <div>{extra}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
    </div>
  );
}
