import { useState } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const mostrar = (mensagem, tipo = 'sucesso') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, mensagem, tipo }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  return { toasts, mostrar };
}

export function ToastContainer({ toasts }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`px-4 py-3 rounded-lg text-sm shadow-lg text-white transition-all ${
          t.tipo === 'sucesso' ? 'bg-green-700' :
          t.tipo === 'erro'   ? 'bg-red-700'   : 'bg-gray-800'
        }`}>
          {t.mensagem}
        </div>
      ))}
    </div>
  );
}
