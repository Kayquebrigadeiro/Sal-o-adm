export default function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {Icon && <Icon size={64} className="text-blue-200 mb-4" />}
      <h3 className="text-lg font-medium text-blue-400 mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-blue-400 mb-4">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
