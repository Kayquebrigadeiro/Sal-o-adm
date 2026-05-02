import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function BannerOffline() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const irOffline = () => setOffline(true);
    const irOnline  = () => setOffline(false);

    window.addEventListener('offline', irOffline);
    window.addEventListener('online',  irOnline);

    return () => {
      window.removeEventListener('offline', irOffline);
      window.removeEventListener('online',  irOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white
                    px-4 py-3 flex items-center justify-center gap-3 shadow-lg
                    animate-pulse">
      <WifiOff size={18} />
      <span className="text-sm font-bold uppercase">
        Sem conexão com a internet — Verifique sua rede
      </span>
    </div>
  );
}
