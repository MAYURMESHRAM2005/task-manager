/**
 * Modal shell mirroring the original `.modal-overlay` markup.
 * Renders nothing when closed so the backdrop is never clickable.
 */
export default function Modal({ open, title, onClose, children, footer, maxWidth }) {
  if (!open) return null;
  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={maxWidth ? { maxWidth } : undefined}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
