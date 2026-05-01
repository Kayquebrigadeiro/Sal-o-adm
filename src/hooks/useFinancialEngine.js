// ============================================================================
//  useFinancialEngine.js — Hook React de integração do Motor Financeiro
// ============================================================================
//  Conecta o FinancialEngine com as configurações reais do salão
//  armazenadas no Supabase (tabela `configuracoes`).
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { FinancialEngine } from '../services/FinancialEngine';
import { TAXA_MAQUININHA_PADRAO } from '../services/financialConstants';

/**
 * Hook que instancia o FinancialEngine com configurações do Supabase.
 *
 * @param {string} salaoId - UUID do salão
 * @returns {{
 *   engine: FinancialEngine | null,
 *   config: Object | null,
 *   loading: boolean,
 *   error: string | null,
 *   recarregar: () => void
 * }}
 */
export function useFinancialEngine(salaoId) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  // Buscar configurações do salão no Supabase
  useEffect(() => {
    if (!salaoId) {
      setLoading(false);
      return;
    }

    let cancelado = false;

    const buscar = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: dbError } = await supabase
          .from('configuracoes')
          .select('*')
          .eq('salao_id', salaoId)
          .maybeSingle();

        if (cancelado) return;

        if (dbError) {
          console.error('[FinancialEngine] Erro ao buscar configurações:', dbError);
          setError(`Erro ao buscar configurações: ${dbError.message}`);
          // Usar defaults mesmo com erro
          setConfig({
            custoFixoPorAtendimento: 29.00,
            taxaMaquininhaPct: TAXA_MAQUININHA_PADRAO,
          });
        } else if (data) {
          setConfig({
            custoFixoPorAtendimento: Number(data.custo_fixo_por_atendimento) || 0,
            taxaMaquininhaPct: Number(data.taxa_maquininha_pct) || TAXA_MAQUININHA_PADRAO,
            prolaboreMensal: Number(data.prolabore_mensal) || 0,
          });
        } else {
          // Nenhuma configuração encontrada — usar defaults
          setConfig({
            custoFixoPorAtendimento: 29.00,
            taxaMaquininhaPct: TAXA_MAQUININHA_PADRAO,
          });
        }
      } catch (err) {
        if (!cancelado) {
          console.error('[FinancialEngine] Erro inesperado:', err);
          setError(err.message);
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    buscar();

    return () => { cancelado = true; };
  }, [salaoId, version]);

  // Instanciar o engine quando config mudar
  const engine = useMemo(() => {
    if (!config) return null;
    return new FinancialEngine({
      custoFixoPorAtendimento: config.custoFixoPorAtendimento,
      taxaMaquininhaPct: config.taxaMaquininhaPct,
    });
  }, [config]);

  // Função para forçar recarga das configurações
  const recarregar = () => setVersion((v) => v + 1);

  return { engine, config, loading, error, recarregar };
}

export default useFinancialEngine;
