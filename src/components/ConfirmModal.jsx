import { AlertTriangle, X } from 'lucide-react';

const toneClasses = {
  danger: {
    icon: 'text-red-500 bg-red-50',
    confirm: 'bg-red-600 hover:bg-red-700 text-white shadow-red-200',
  },
  warning: {
    icon: 'text-amber-500 bg-amber-50',
    confirm: 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200',
  },
  info: {
    icon: 'text-sky-500 bg-sky-50',
    confirm: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-200',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-fadeIn flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-full flex items-center justify-center ${classes.icon}`}>
            <AlertTriangle size={24} />
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">{title}</h2>
        {message && <p className="mt-2 text-sm leading-relaxed text-gray-500 font-bold uppercase">{message}</p>}

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors uppercase text-sm disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-[2] py-3.5 rounded-xl font-black uppercase transition-all shadow-lg text-sm disabled:opacity-50 ${classes.confirm}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
