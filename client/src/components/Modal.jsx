export default function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto border-2 border-paper bg-base-200 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between border-b-2 border-paper pb-3">
          <h2 className="heading text-40">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="cursor-pointer font-mono text-3xl leading-none text-muted hover:text-paper">
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
