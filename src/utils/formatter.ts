/**
 * Formatadores de dados
 */

// Fuso horário local da operação
const TIMEZONE = 'America/Manaus'; // GMT-4 (sem horário de verão)

/**
 * Retorna a data/hora atual no fuso de Manaus como objeto Date
 * cujos campos (getFullYear, getMonth, getDate, etc.) refletem
 * a hora local — não UTC.
 *
 * Estratégia: formata a data atual em Manaus via Intl e reconstrói
 * um Date a partir dessa string, evitando dependências externas.
 */
export function hojeManaus(): Date {
  const agora = new Date();
  // Formata no fuso de Manaus: "2024-01-15T20:30:00"
  const partes = new Intl.DateTimeFormat('sv-SE', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(agora).replace(' ', 'T');

  // Reconstrói sem indicador de timezone → tratado como local pelo motor JS
  return new Date(partes);
}

/**
 * Converte uma Date para string YYYY-MM-DD no fuso de Manaus
 */
export function toDateStringManaus(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Constrói uma string YYYY-MM-DD a partir de componentes numéricos,
 * sem instanciar Date — evita bugs de timezone ao usar new Date(ano, mes, dia).
 */
export function buildDateString(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/**
 * Avança uma data YYYY-MM-DD em N dias, sem instanciar Date com timezone.
 * Usado para contornar o bug das SPs: WHERE Data BETWEEN @DataInicio AND @DataFim
 * compara DateTime vs DATE, excluindo o último dia (hora > 00:00:00).
 * ⚠️ TEMPORÁRIO — remover quando o script 04_fix_where_cast_date.sql for executado no banco.
 */
export function addDays(dateStr: string, days: number): string {
  const [ano, mes, dia] = dateStr.split('-').map(Number);
  const d = new Date(ano, mes - 1, dia + days);
  return buildDateString(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * Retorna o último dia de um mês como número.
 * Usa o truque nativo: dia 0 do mês seguinte = último dia do mês atual.
 * Isso é seguro pois não envolve formatação de fuso.
 */
export function ultimoDiaMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

/**
 * Converte nome do dia da semana retornado pelo SQL Server (inglês)
 * para português. DATENAME(WEEKDAY) depende do LANGUAGE da instância.
 * @deprecated — prefira calcDiaSemana(date) que deriva o dia direto do objeto Date
 */
export function diaSemanaParaPtBR(dia: string): string {
  const mapa: Record<string, string> = {
    Monday: 'Segunda-feira',
    Tuesday: 'Terça-feira',
    Wednesday: 'Quarta-feira',
    Thursday: 'Quinta-feira',
    Friday: 'Sexta-feira',
    Saturday: 'Sábado',
    Sunday: 'Domingo',
  };
  return mapa[dia] ?? dia;
}

/**
 * Retorna o nome do dia da semana em português a partir de um objeto Date,
 * considerando o fuso de Manaus. Não depende do LANGUAGE do SQL Server.
 * Usar sempre que a data vier do banco como objeto Date (driver mssql).
 */
export function calcDiaSemana(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Manaus',
    weekday: 'long',
  }).format(date);
}

/**
 * Formata valor em moeda brasileira
 */
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Formata número com separador de milhares
 */
export function formatarNumero(num: number, casasDecimais: number = 2): string {
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais,
  });
}

/**
 * Formata data para formato brasileiro
 */
export function formatarData(data: Date | string): string {
  const date = typeof data === 'string' ? new Date(data) : data;
  return date.toLocaleDateString('pt-BR');
}

/**
 * Formata data e hora
 */
export function formatarDataHora(data: Date | string): string {
  const date = typeof data === 'string' ? new Date(data) : data;
  return date.toLocaleString('pt-BR');
}

/**
 * Pega as datas da última semana (Segunda a Domingo) no fuso de Manaus
 */
export function getPreviousWeekRange(): { start: Date; end: Date } {
  const today = hojeManaus();
  const currentDate = new Date(today);
  const dayOfWeek = currentDate.getDay();
  const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;

  currentDate.setDate(currentDate.getDate() - adjustedDay + 1);

  const startOfPreviousWeek = new Date(currentDate);
  startOfPreviousWeek.setDate(startOfPreviousWeek.getDate() - 7);

  const endOfPreviousWeek = new Date(startOfPreviousWeek);
  endOfPreviousWeek.setDate(endOfPreviousWeek.getDate() + 6);

  startOfPreviousWeek.setHours(0, 0, 0, 0);
  endOfPreviousWeek.setHours(23, 59, 59, 999);

  return {
    start: startOfPreviousWeek,
    end: endOfPreviousWeek,
  };
}

/**
 * Pega as datas da semana atual (Segunda a Domingo) no fuso de Manaus
 */
export function getCurrentWeekRange(): { start: Date; end: Date } {
  const today = hojeManaus();
  const dayOfWeek = today.getDay();
  const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;

  const startOfCurrentWeek = new Date(today);
  startOfCurrentWeek.setDate(today.getDate() - adjustedDay + 1);
  startOfCurrentWeek.setHours(0, 0, 0, 0);

  const endOfCurrentWeek = new Date(startOfCurrentWeek);
  endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6);
  endOfCurrentWeek.setHours(23, 59, 59, 999);

  return {
    start: startOfCurrentWeek,
    end: endOfCurrentWeek,
  };
}

/**
 * Formata percentual
 */
export function formatarPercentual(valor: number, casasDecimais: number = 2): string {
  return `${valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais,
  })}%`;
}

/**
 * Formata duração em horas/minutos
 */
export function formatarDuracao(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;

  if (horas === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${horas}h`;
  }

  return `${horas}h ${mins}m`;
}

/**
 * Formata tamanho de arquivo
 */
export function formatarTamanhoArquivo(bytes: number): string {
  const unidades = ['B', 'KB', 'MB', 'GB'];
  let tamanho = bytes;
  let unidadeIndex = 0;

  while (tamanho >= 1024 && unidadeIndex < unidades.length - 1) {
    tamanho /= 1024;
    unidadeIndex++;
  }

  return `${tamanho.toFixed(2)} ${unidades[unidadeIndex]}`;
}

/**
 * Trunca string com ellipsis
 */
export function truncarString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Capitaliza primeira letra
 */
export function capitalizarPrimeira(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Capitaliza todas as palavras
 */
export function capitalizarPalavras(str: string): string {
  return str
    .split(' ')
    .map((palavra) => capitalizarPrimeira(palavra))
    .join(' ');
}

/**
 * Converte booleano para sim/não
 */
export function formatarBooleano(valor: boolean): string {
  return valor ? 'Sim' : 'Não';
}

/**
 * Formata intervalo de datas
 */
export function formatarIntervaloData(dataInicio: Date | string, dataFim: Date | string): string {
  const inicio = formatarData(dataInicio);
  const fim = formatarData(dataFim);
  return `${inicio} a ${fim}`;
}

/**
 * Converte array para string com separador
 */
export function formatarLista(items: string[], separador: string = ', '): string {
  if (items.length === 0) {
    return '';
  }

  if (items.length === 1) {
    return items[0];
  }

  return items.slice(0, -1).join(separador) + ` e ${items[items.length - 1]}`;
}

/**
 * Formata nome de equipe com emoji
 */
export function formatarEquipeComEmoji(nomeEquipe: string): string {
  const emojis: { [key: string]: string } = {
    loja: '🏪',
    'food service': '🍽️',
    varejo: '🛒',
    redes: '🏬',
    telemarketing: '☎️',
  };

  const emoji = emojis[nomeEquipe.toLowerCase()] || '📊';
  return `${emoji} ${nomeEquipe}`;
}