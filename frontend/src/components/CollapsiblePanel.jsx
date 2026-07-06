import { ChevronDown, ChevronUp } from 'lucide-react';

export default function CollapsiblePanel({
  title,
  badge,
  actions,
  open,
  onToggle,
  children,
  className = '',
  bodyClassName = '',
  compact = false,
}) {
  return (
    <section className={`collapsible-panel card ${compact ? 'compact' : ''} ${open ? 'is-open' : 'is-collapsed'} ${className}`}>
      <div className="collapsible-panel-header">
        <button type="button" className="collapsible-panel-toggle" onClick={onToggle} aria-expanded={open}>
          <div className="collapsible-panel-title-row">
            {title && <h3 className="heading-sm collapsible-panel-title">{title}</h3>}
            {badge != null && <span className="collapsible-panel-badge">{badge}</span>}
          </div>
          <span className="collapsible-panel-chevron" aria-hidden>
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>
        {actions && <div className="collapsible-panel-actions">{actions}</div>}
      </div>
      {open && <div className={`collapsible-panel-body ${bodyClassName}`}>{children}</div>}
    </section>
  );
}
