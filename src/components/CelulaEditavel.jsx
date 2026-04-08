import { useState } from 'react';

export default function CelulaEditavel({ valor, onSave, tipo = 'number', step = '0.01', habilitada = true, formato = 'moeda' }) {
  const [editando, setEditando] = useState(false);
  const [local, setLocal] = useState(String(valor || ''));
  const [salvo, setSalvo] = useState(false);

  const handleBlur = async () => {
    setEditando(false);
    if (local !== String(valor || '')) {
      await onSave(local);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2000);
    }
  };

  if (!habilitada) {
    return <span className="text-gray-300">—</span>;
  }

  if (editando) {
    return (
      <input
        autoFocus
        type={tipo}
        step={step}
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => e.key === 'Enter' && handleBlur()}
        className="w-20 border border-blue-400 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
    );
  }

  const valorFormatado = formato === 'moeda' && valor 
    ? `R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : local || '—';

  return (
    <span
      onClick={() => setEditando(true)}
      className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded text-xs group inline-flex items-center gap-1 transition-colors"
    >
      {valorFormatado}
      {salvo && <span className="text-green-600 text-[10px]">✓</span>}
      <span className="text-gray-300 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">✏</span>
    </span>
  );
}
