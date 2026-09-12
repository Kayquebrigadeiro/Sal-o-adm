import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { onMudancaLentidao } from '../services/api';

/**
 * Banner fixo exibido quando alguma requisição à API está pendente há mais de
 * 4s (ex.: backend Render free acordando do cold start). Evita que o usuário
 * ache que a tela travou. Presentação apenas — nenhuma lógica de dados.
 */
export default function IndicadorConectando() {
  const [lento, setLento] = useState(false);

  useEffect(() => onMudancaLentidao(setLento), []);

  if (!lento) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9998] bg-amber-500 text-white
                  px-4 py-2.5 flex items-center justify-center gap-2.5 shadow-lg"
      role="status"
      aria-live="polite"
    >
      <Loader2 size={16} className="animate-spin shrink-0" />
      <span className="text-sm font-bold uppercase text-center">
        Conectando ao servidor… aguarde alguns segundos
      </span>
    </div>
  );
}
