export default function WorkspacePageHeader({ title, subtitle, action, actionLabel, onAction, actionDisabled }) {
  return (
    <div className="workspace-page-header">
      <div className="page-header-block">
        <h1 className="heading-lg">{title}</h1>
        {subtitle && <p className="text-secondary">{subtitle}</p>}
      </div>
      {action && (
        <button type="button" className="btn btn-primary workspace-header-cta" disabled={actionDisabled} onClick={onAction}>
          {actionLabel || action}
        </button>
      )}
      {typeof action === 'object' && action}
    </div>
  );
}
