import { AlertCircle } from 'lucide-react';

export default function BannerRenovacao({ diasRestantes }) {
  const wppSuporte = import.meta.env.VITE_WHATSAPP_SUPORTE;

  const abrirWhatsApp = () => {
    const msg = encodeURIComponent(`Olá! Minha assinatura vence em ${diasRestantes} dias. Gostaria de renovar.`);
    window.open(`https://wa.me/55${wppSuporte}?text=${msg}`, '_blank');
  };

  if (diasRestantes > 5 || diasRestantes < 0) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium shadow-md z-40 relative">
      <AlertCircle className="w-5 h-5 animate-pulse" />
      <span>
        ⚠️ Atenção! Sua assinatura vence em <strong>{diasRestantes} dias</strong>. Renove agora para não perder o acesso.
      </span>
      <button 
        onClick={abrirWhatsApp}
        className="ml-2 bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-md text-xs font-bold border border-white/30"
      >
        RENOVAR AGORA
      </button>
    </div>
  );
}
