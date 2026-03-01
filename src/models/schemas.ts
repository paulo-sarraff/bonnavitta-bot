// ============================================
// Modelos de Dados
// ============================================

export interface Usuario {
  id: number;
  cpf: string;
  nome: string;
  email?: string;
  telefone: string;
  equipeId: number;
  nomeEquipe: string;
  roles?: string[];
  ativo: boolean;
}

export interface Equipe {
  id: number;
  nome: string;
  descricao?: string;
}

export interface Vendedor {
  id: number;
  nome: string;
  cpf: string;
  equipeId: number;
  ativo: boolean;
}

export interface VendaPorEquipe {
  id: number;
  equipe: string;
  totalTransacoes: number;
  totalVendedores: number;
  valorTotal: number;
  ticketMedio: number;
}

export interface VendaPorVendedor {
  id: number;
  vendedor: string;
  equipe: string;
  totalTransacoes: number;
  valorTotal: number;
  ticketMedio: number;
  primeiraVenda: Date;
  ultimaVenda: Date;
}

export interface RankingProduto {
  id: number;
  nome: string;
  categoria: string;
  quantidadeVendida: number;
  valorTotal: number;
  totalTransacoes: number;
}

export interface PerformanceEquipe {
  id: number;
  equipe: string;
  totalTransacoes: number;
  totalVendedores: number;
  valorTotal: number;
  ticketMedio: number;
  vendaPorVendedor: number;
}

// ============================================
// Modelos de Sessão
// ============================================

export interface SessaoBot {
  id: number;
  usuarioId: number;
  canal: 'telegram' | 'whatsapp';
  chatId: string;
  estadoAtual: string;
  dadosContexto?: Record<string, any>;
  token: string;
  criadoEm: number;
  expiraEm: number;
}

export interface ContextoDados {
  dataInicio?: string;
  dataFim?: string;
  equipeId?: number;
  vendedorId?: number;
  tipo?: string;
  opcaoSelecionada?: string;
  [key: string]: any;
}

// ============================================
// Modelos de Requisição/Resposta
// ============================================

export interface LoginRequest {
  cpf: string;
  telefone: string;
  canal: 'telegram' | 'whatsapp';
  chatId: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  usuario?: Usuario;
  mensagem: string;
}

export interface MensagemBotRequest {
  usuarioId: number;
  canal: 'telegram' | 'whatsapp';
  chatId: string;
  mensagem: string;
}

export interface MensagemBotResponse {
  resposta: string;
  opcoes?: OpçãoMenu[];
  gráfico?: string;
  proximoEstado: string;
}

export interface OpçãoMenu {
  id: string;
  texto: string;
  emoji?: string;
}

// ============================================
// Modelos de Menu
// ============================================

export enum EstadoBot {
  // ── Login ───────────────────────────────────────────────────────────────────
  AGUARDANDO_CPF = 'aguardando_cpf',
  AGUARDANDO_TELEFONE = 'aguardando_telefone',
  AGUARDANDO_LOGIN = 'aguardando_login',

  // ── Menu principal ──────────────────────────────────────────────────────────
  MENU_PRINCIPAL = 'menu_principal',

  // ── Item 1: Supervisor ──────────────────────────────────────────────────────
  // Período → Lista supervisores → Escolha → Análise detalhada → Loop
  AGUARDANDO_PERIODO_SUPERVISOR = 'aguardando_periodo_supervisor',
  EXIBINDO_SUPERVISORES = 'exibindo_supervisores',
  AGUARDANDO_ESCOLHA_SUPERVISOR = 'aguardando_escolha_supervisor',
  EXIBINDO_ANALISE_SUPERVISOR = 'exibindo_analise_supervisor',

  // ── Item 2: Vendedor ────────────────────────────────────────────────────────
  // Período → Lista vendedores → Código → Análise detalhada → Loop
  AGUARDANDO_PERIODO_VENDEDOR = 'aguardando_periodo_vendedor',
  EXIBINDO_VENDEDORES = 'exibindo_vendedores',
  AGUARDANDO_CODIGO_VENDEDOR = 'aguardando_codigo_vendedor',
  EXIBINDO_ANALISE_VENDEDOR = 'exibindo_analise_vendedor',

  // ── Item 3: Vendas por Dia ──────────────────────────────────────────────────
  // Tipo de Resumo (A-E) → Formato → Resultado → Loop
  AGUARDANDO_TIPO_RESUMO_DIA = 'aguardando_tipo_resumo_dia',
  AGUARDANDO_FORMATO_DIA = 'aguardando_formato_dia',
  EXIBINDO_RESULTADO_DIA = 'exibindo_resultado_dia',

  // ── Item 4: Fabricante ──────────────────────────────────────────────────────
  // Período → Processamento direto
  AGUARDANDO_PERIODO_FABRICANTE = 'aguardando_periodo_fabricante',

  // ── Estados genéricos / legados ─────────────────────────────────────────────
  MENU_COMERCIAL = 'menu_comercial',
  MENU_VENDAS_SUPERVISOR = 'menu_vendas_supervisor',
  MENU_VENDAS_VENDEDOR = 'menu_vendas_vendedor',
  MENU_VENDAS_DIA = 'menu_vendas_dia',
  MENU_VENDAS_FABRICANTE = 'menu_vendas_fabricante',
  AGUARDANDO_PERIODO_SIMPLES = 'aguardando_periodo_simples',
  AGUARDANDO_PERIODO_VENDAS_DIA = 'aguardando_periodo_vendas_dia',
  AGUARDANDO_FORMATO_RESPOSTA = 'aguardando_formato_resposta',
  AGUARDANDO_SELECAO_EQUIPE = 'aguardando_selecao_equipe',
  AGUARDANDO_SELECAO_VENDEDOR = 'aguardando_selecao_vendedor',
  AGUARDANDO_SELECAO_FABRICANTE = 'aguardando_selecao_fabricante',
  AGUARDANDO_DATA = 'aguardando_data',
  AGUARDANDO_TIPO_CONSULTA = 'aguardando_tipo_consulta',
  AGUARDANDO_EQUIPE = 'aguardando_equipe',
  AGUARDANDO_VENDEDOR = 'aguardando_vendedor',
  PROCESSANDO = 'processando',
  EXIBINDO_RESULTADO = 'exibindo_resultado',
  ENCERRADO = 'encerrado',
}

export interface MenuPrincipal {
  titulo: string;
  opcoes: OpçãoMenu[];
}

// ============================================
// Modelos de Auditoria
// ============================================

export interface AuditoriaAcesso {
  usuarioId: number;
  acao: string;
  detalhes?: string;
  ipAddress?: string;
}

// ============================================
// Modelos de Erro
// ============================================

export interface ErroResposta {
  codigo: string;
  mensagem: string;
  detalhes?: string;
}

// ============================================
// Modelos de Vendas Detalhadas
// ============================================

export interface VendasPorSupervisorDetalhado {
  nomeSetor: string;
  totalVendas: number;
  quantidadePedidos: number;
  quantidadeVendedores: number;
}

export interface VendasPorVendedorDetalhado {
  setorClientes: number;
  nomeVendedor: string;
  totalVendas: number;
  quantidadePedidos: number;
  quantidadeClientes: number;
  fabricanteMaisVendido: string;
  produtoMaisVendido: string;
  quantidadeProdutoMaisVendido: number;
}

export interface VendasPorFabricanteDetalhado {
  nomeFabricante: string;
  totalVendas: number;
  quantidadePedidos: number;
  quantidadeVendedores: number;
  quantidadeClientes: number;
  produtoMaisVendido: string;
  quantidadeProdutoMaisVendido: number;
}

export interface VendasPorDiaDetalhado {
  data: string;
  diaSemana: string;
  totalVendas: number;
  quantidadePedidos: number;
}