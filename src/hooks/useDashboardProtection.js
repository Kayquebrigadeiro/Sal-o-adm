import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

/**
 * Hook para gerenciar a proteção inteligente do Dashboard Financeiro.
 * 
 * - Carrega configuração de proteção do banco (dashboard_protection_enabled)
 * - Escuta eventos de visibilidade (visibilitychange, blur/focus)
 * - Gerencia estado isLocked (apenas em memória — sem LocalStorage/SessionStorage)
 * - Valida PIN exclusivamente no backend (nunca expõe o PIN real no frontend)
 * - Quando proteção ativada: Dashboard abre bloqueado + bloqueia ao perder foco
 * - Quando desativada: Dashboard abre livre, sem bloqueio por foco
 */
export default function useDashboardProtection(salaoId) {
  const [protectionEnabled, setProtectionEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(true); // começa bloqueado por segurança
  const [loading, setLoading] = useState(true);
  const wasUnlockedRef = useRef(false); // rastreia se o dashboard já foi desbloqueado nesta sessão

  // ─── Carregar configuração do banco ───
  const fetchConfig = useCallback(async () => {
    if (!salaoId) return;
    setLoading(true);
    try {
      const res = await api.get('/cadastros/configuracoes');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const enabled = data?.dashboard_protection_enabled ?? false;

      setProtectionEnabled(enabled);

      // Se proteção desativada, desbloqueia direto
      if (!enabled) {
        setIsLocked(false);
        wasUnlockedRef.current = true;
      } else {
        // Proteção ativada: começa bloqueado
        setIsLocked(true);
        wasUnlockedRef.current = false;
      }
    } catch (err) {
      console.error('Erro ao carregar proteção do Dashboard:', err);
      // Em caso de erro, desbloqueia para não travar o acesso
      setIsLocked(false);
      wasUnlockedRef.current = true;
    } finally {
      setLoading(false);
    }
  }, [salaoId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // ─── Escutar perda de foco ───
  useEffect(() => {
    if (!protectionEnabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && wasUnlockedRef.current) {
        setIsLocked(true);
        wasUnlockedRef.current = false;
      }
    };

    const handleBlur = () => {
      if (wasUnlockedRef.current) {
        setIsLocked(true);
        wasUnlockedRef.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [protectionEnabled]);

  // ─── Desbloquear com PIN (validação no backend) ───
  const unlock = useCallback(async (inputPin) => {
    try {
      const res = await api.post('/auth/verify-dashboard-password', {
        password: inputPin
      });
      const data = await res.json();

      if (data.authorized) {
        setIsLocked(false);
        wasUnlockedRef.current = true;
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erro ao verificar PIN do Dashboard:', err);
      return false;
    }
  }, []);

  return {
    isLocked,
    setIsLocked,
    protectionEnabled,
    loading,
    unlock,
    refetch: fetchConfig,
  };
}