// ============================================================================
//  categorias.js — Constantes de categorias de procedimentos
// ============================================================================
//  Alinhado com categoria_enum no banco (V6):
//    SERVICO_CABELO | PRODUTO_APLICADO | SERVICO_ESTETICA
// ============================================================================

export const CATEGORIAS = {
  SERVICO_CABELO: {
    label: 'Serviços de Cabelo',
    descricao: 'Corte, progressiva, coloração, hidratação...',
    icon: 'Scissors',
    emoji: '✂️',
    cor: 'emerald',
    temComprimento: true,
    // Cores Tailwind para gráficos e UI
    bgLight: 'bg-emerald-50',
    bgDark: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    chartColor: '#10b981',
  },
  PRODUTO_APLICADO: {
    label: 'Produtos Aplicados',
    descricao: 'Produtos de marca comprados como estoque e cobrados por aplicação',
    icon: 'FlaskConical',
    emoji: '🧴',
    cor: 'violet',
    temComprimento: false,
    bgLight: 'bg-violet-50',
    bgDark: 'bg-violet-500',
    textColor: 'text-violet-700',
    borderColor: 'border-violet-200',
    chartColor: '#8b5cf6',
  },
  SERVICO_ESTETICA: {
    label: 'Serviços de Estética',
    descricao: 'Unhas, sobrancelha, cílios, depilação...',
    icon: 'Sparkles',
    emoji: '💅',
    cor: 'pink',
    temComprimento: false,
    bgLight: 'bg-pink-50',
    bgDark: 'bg-pink-500',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200',
    chartColor: '#ec4899',
  },
};

export const ORDEM_CATEGORIAS = [
  'SERVICO_CABELO',
  'PRODUTO_APLICADO',
  'SERVICO_ESTETICA',
];

// ─── Sugestões para chips rápidos no Wizard ──────────────────────────────────

export const SUGESTOES = {
  SERVICO_CABELO: [
    { nome: 'PROGRESSIVA', comissao: 30 },
    { nome: 'CORTE', comissao: 30 },
    { nome: 'COLORAÇÃO', comissao: 50 },
    { nome: 'LUZES', comissao: 30 },
    { nome: 'HIDRATAÇÃO', comissao: 45 },
    { nome: 'NUTRIÇÃO', comissao: 45 },
    { nome: 'RECONSTRUÇÃO', comissao: 45 },
    { nome: 'DETOX', comissao: 45 },
    { nome: 'PLÁSTICA DOS FIOS', comissao: 45 },
    { nome: 'KIT LAVATÓRIO', comissao: 50 },
    { nome: 'HEAD SPA', comissao: 40 },
  ],
  PRODUTO_APLICADO: [
    { nome: 'WELLA FUSION', marca: 'Wella Professionals' },
    { nome: 'BOTOX CAPILAR', marca: '' },
    { nome: 'NANO PLÁSTICA', marca: '' },
  ],
  SERVICO_ESTETICA: [
    { nome: 'UNHAS GEL', comissao: 45 },
    { nome: 'UNHAS TRADICIONAL', comissao: 45 },
    { nome: 'SOBRANCELHA', comissao: 50 },
    { nome: 'EXTENSÃO DE CÍLIOS', comissao: 100 },
    { nome: 'BUSSO', comissao: 50 },
    { nome: 'AXILA', comissao: 50 },
    { nome: 'DEPILAÇÃO', comissao: 50 },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Retorna a config de uma categoria, com fallback para SERVICO_CABELO */
export const getCategoria = (key) =>
  CATEGORIAS[key] || CATEGORIAS.SERVICO_CABELO;

/** Retorna a cor hex do gráfico para uma categoria */
export const getChartColor = (key) =>
  (CATEGORIAS[key]?.chartColor) || '#6366f1';
