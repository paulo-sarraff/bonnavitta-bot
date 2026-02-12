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
  role: 'admin' | 'gerente' | 'vendedor' | 'supervisor' | 'diretoria';
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
  AGUARDANDO_LOGIN = 'aguardando_login',
  MENU_PRINCIPAL = 'menu_principal',
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
