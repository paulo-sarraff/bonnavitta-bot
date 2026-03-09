/**
 * Formatadores de dados
 */

const TIMEZONE = 'America/Manaus'; // GMT-4 (sem horário de verão)

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES DE DATA — todas trabalham com strings YYYY-MM-DD puras.
// NUNCA dependem do timezone do servidor Node.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna a data de hoje em Manaus como string YYYY-MM-DD.
 * Usa Intl diretamente — zero dependência do timezone do servidor.
 */
export function hojeStr(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Constrói YYYY-MM-DD a partir de componentes numéricos.
 */
export function buildDateString(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/**
 * Soma N dias a uma string YYYY-MM-DD.
 * Usa Date apenas para aritmética de calendário (não para formatação),
 * então o timezone do servidor não afeta o resultado da string retornada.
 */
export function addDays(dateStr: string, days: number): string {
  const [ano, mes, dia] = dateStr.split('-').map(Number);
  const d = new Date(ano, mes - 1, dia + days);
  return buildDateString(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * Retorna o último dia do mês como número.
 */
export function ultimoDiaMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

/**
 * Retorna o dia da semana ISO (1=Seg … 7=Dom) de uma string YYYY-MM-DD.
 */
function diaDaSemana(dateStr: string): number {
  const [ano, mes, dia] = dateStr.split('-').map(Number);
  const dow = new Date(ano, mes - 1, dia).getDay(); // 0=Dom … 6=Sab
  return dow === 0 ? 7 : dow;
}

/**
 * Retorna {inicio, fim} da semana atual (Seg-Dom) como strings YYYY-MM-DD.
 */
export function semanaAtualStr(): { inicio: string; fim: string } {
  const hoje = hojeStr();
  const dow = diaDaSemana(hoje);
  const inicio = addDays(hoje, -(dow - 1));
  return { inicio, fim: addDays(inicio, 6) };
}

/**
 * Retorna {inicio, fim} da semana anterior (Seg-Dom) como strings YYYY-MM-DD.
 */
export function semanaAnteriorStr(): { inicio: string; fim: string } {
  const { inicio } = semanaAtualStr();
  return { inicio: addDays(inicio, -7), fim: addDays(inicio, -1) };
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGADOS — mantidos para não quebrar imports existentes
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated use hojeStr() */
export function hojeManaus(): Date {
  const s = hojeStr();
  const [ano, mes, dia] = s.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

/** @deprecated use buildDateString / hojeStr diretamente */
export function toDateStringManaus(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

/** @deprecated use semanaAtualStr() */
export function getCurrentWeekRange(): { start: Date; end: Date } {
  const { inicio, fim } = semanaAtualStr();
  const [a1, m1, d1] = inicio.split('-').map(Number);
  const [a2, m2, d2] = fim.split('-').map(Number);
  return { start: new Date(a1, m1 - 1, d1), end: new Date(a2, m2 - 1, d2) };
}

/** @deprecated use semanaAnteriorStr() */
export function getPreviousWeekRange(): { start: Date; end: Date } {
  const { inicio, fim } = semanaAnteriorStr();
  const [a1, m1, d1] = inicio.split('-').map(Number);
  const [a2, m2, d2] = fim.split('-').map(Number);
  return { start: new Date(a1, m1 - 1, d1), end: new Date(a2, m2 - 1, d2) };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIA DA SEMANA — a partir de objeto Date do driver mssql
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna nome do dia em pt-BR a partir de Date do driver mssql, no fuso Manaus.
 * Não depende de DATENAME/LANGUAGE do SQL Server.
 */
export function calcDiaSemana(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TIMEZONE, weekday: 'long' }).format(date);
}

/** @deprecated use calcDiaSemana(date) */
export function diaSemanaParaPtBR(dia: string): string {
  const mapa: Record<string, string> = {
    Monday: 'Segunda-feira', Tuesday: 'Terça-feira', Wednesday: 'Quarta-feira',
    Thursday: 'Quinta-feira', Friday: 'Sexta-feira', Saturday: 'Sábado', Sunday: 'Domingo',
  };
  return mapa[dia] ?? dia;
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATAÇÃO DE VALORES
// ─────────────────────────────────────────────────────────────────────────────

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarNumero(num: number, casasDecimais: number = 2): string {
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais,
  });
}

/**
 * Formata data para DD/MM/YYYY.
 * Se receber string YYYY-MM-DD, formata diretamente sem construir Date
 * (evita off-by-one de timezone). Se receber Date, usa Intl com fuso Manaus.
 */
export function formatarData(data: Date | string): string {
  if (typeof data === 'string') {
    const match = data.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TIMEZONE }).format(data as Date);
}

export function formatarDataHora(data: Date | string): string {
  const date = typeof data === 'string' ? new Date(data) : data;
  return date.toLocaleString('pt-BR');
}

export function formatarIntervaloData(dataInicio: Date | string, dataFim: Date | string): string {
  return `${formatarData(dataInicio)} a ${formatarData(dataFim)}`;
}

export function formatarPercentual(valor: number, casasDecimais: number = 2): string {
  return `${valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casasDecimais, maximumFractionDigits: casasDecimais,
  })}%`;
}

export function formatarDuracao(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (horas === 0) return `${mins}m`;
  if (mins === 0) return `${horas}h`;
  return `${horas}h ${mins}m`;
}

export function formatarTamanhoArquivo(bytes: number): string {
  const unidades = ['B', 'KB', 'MB', 'GB'];
  let tamanho = bytes; let i = 0;
  while (tamanho >= 1024 && i < unidades.length - 1) { tamanho /= 1024; i++; }
  return `${tamanho.toFixed(2)} ${unidades[i]}`;
}

export function truncarString(str: string, maxLength: number): string {
  return str.length <= maxLength ? str : str.substring(0, maxLength - 3) + '...';
}

export function capitalizarPrimeira(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function capitalizarPalavras(str: string): string {
  return str.split(' ').map(capitalizarPrimeira).join(' ');
}

export function formatarBooleano(valor: boolean): string {
  return valor ? 'Sim' : 'Não';
}

export function formatarLista(items: string[], separador: string = ', '): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(separador) + ` e ${items[items.length - 1]}`;
}

export function formatarEquipeComEmoji(nomeEquipe: string): string {
  const emojis: Record<string, string> = {
    loja: '🏪', 'food service': '🍽️', varejo: '🛒', redes: '🏬', telemarketing: '☎️',
  };
  return `${emojis[nomeEquipe.toLowerCase()] || '📊'} ${nomeEquipe}`;
}