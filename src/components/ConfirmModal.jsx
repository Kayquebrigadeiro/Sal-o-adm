import { AlertTriangle, X } from 'lucide-react';

const toneClasses = {
  danger: {
    icon: 'bg-red-100 text-red-600',
    confirm: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    icon: 'bg-amber-100 text-amber-600',
    confirm: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
  info: {
    icon: 'bg-sky-100 text-sky-600',
    confirm: 'bg-sky-600 hover:bg-sky-700 text-white',
  },
};

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'CONFIRMAR',
  cancelLabel = 'CANCELAR',
  tone = 'danger',
  loading = false,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  const classes = toneClasses[tone] || toneClasses.danger;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${classes.icon}`}>
            <AlertTriangle size={28} />
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <h2 className="text-2xl font-black text-gray-800 uppercase">{title}</h2>
        {message && <p className="mt-3 text-sm leading-6 text-gray-600 uppercase whitespace-pre-line">{message}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-bold uppercase text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-black uppercase transition-colors disabled:opacity-50 ${classes.confirm}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
