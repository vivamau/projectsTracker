import Modal from './Modal';

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'Delete', danger = true }) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-sm">
      <p className="text-text-secondary mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium hover:bg-surface transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
            danger ? 'bg-error-500 hover:bg-error-600' : 'bg-primary-500 hover:bg-primary-600'
          }`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
