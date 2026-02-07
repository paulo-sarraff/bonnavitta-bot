/**
 * Formatadores de dados
 */

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
