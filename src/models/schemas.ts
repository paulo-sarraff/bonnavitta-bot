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
  roles?: string[]; // ✅ NOVO: Suportar múltiplas roles
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
  // ✅ NOVO: Controle de expiração de sessão (24h)
  criadoEm: number; // Timestamp em ms
  expiraEm: number; // Timestamp em ms
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
  AGUARDANDO_CPF = 'aguardando_cpf',
  AGUARDANDO_TELEFONE = 'aguardando_telefone',
  AGUARDANDO_LOGIN = 'aguardando_login',
  MENU_PRINCIPAL = 'menu_principal',
  
  // ✅ NOVOS ESTADOS - MENU COMERCIAL
  MENU_COMERCIAL = 'menu_comercial',
  MENU_VENDAS_SUPERVISOR = 'menu_vendas_supervisor',
  MENU_VENDAS_VENDEDOR = 'menu_vendas_vendedor',
  MENU_VENDAS_DIA = 'menu_vendas_dia',
  MENU_VENDAS_FABRICANTE = 'menu_vendas_fabricante',
  
  // ✅ NOVOS ESTADOS - SUBMENU PERÍODOS
  AGUARDANDO_PERIODO_SIMPLES = 'aguardando_periodo_simples',
  AGUARDANDO_PERIODO_VENDAS_DIA = 'aguardando_periodo_vendas_dia',
  AGUARDANDO_FORMATO_RESPOSTA = 'aguardando_formato_resposta',
  
  // ✅ NOVOS ESTADOS - ANÁLISE DETALHADA
  AGUARDANDO_SELECAO_EQUIPE = 'aguardando_selecao_equipe',
  AGUARDANDO_SELECAO_VENDEDOR = 'aguardando_selecao_vendedor',
  AGUARDANDO_SELECAO_FABRICANTE = 'aguardando_selecao_fabricante',
  
  // Estados existentes
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
// ✅ NOVOS MODELOS - VENDAS DETALHADAS
// ============================================

export interface VendasPorSupervisorDetalhado {
  nomeSetor: string; // Equipe (VAREJO, FOOD SERVICE, REDES, TELEMARKETING)
  totalVendas: number;
  quantidadePedidos: number;
  quantidadeVendedores: number;
}

export interface VendasPorVendedorDetalhado {
  setorClientes: number; // Código do setor (201, 202, etc)
  nomeVendedor: string; // NomeGuerr_Pedido
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