/**
 * Validadores de entrada
 */

/**
 * Valida CPF (formato básico)
 */
export function validarCPF(cpf: string): boolean {
  const cpfLimpo = cpf.replace(/\D/g, '');

  if (cpfLimpo.length !== 11) {
    return false;
  }

  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpfLimpo)) {
    return false;
  }

  return true;
}

/**
 * Valida telefone (formato básico)
 */
export function validarTelefone(telefone: string): boolean {
  const telefoneLimpo = telefone.replace(/\D/g, '');
  return telefoneLimpo.length >= 10 && telefoneLimpo.length <= 11;
}

/**
 * Valida data (formato YYYY-MM-DD)
 */
export function validarData(data: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(data)) {
    return false;
  }

  const date = new Date(data);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Valida email
 */
export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Valida canal (telegram ou whatsapp)
 */
export function validarCanal(canal: string): boolean {
  return ['telegram', 'whatsapp'].includes(canal);
}

/**
 * Valida role
 */
export function validarRole(role: string): boolean {
  return ['admin', 'gerente', 'vendedor'].includes(role);
}

/**
 * Valida se string não está vazia
 */
export function validarStringNaoVazia(str: string): boolean {
  return typeof str === 'string' && str.trim().length > 0;
}

/**
 * Valida se número é positivo
 */
export function validarNumeroPositivo(num: number): boolean {
  return typeof num === 'number' && num > 0;
}

/**
 * Valida se número está em range
 */
export function validarRange(num: number, min: number, max: number): boolean {
  return num >= min && num <= max;
}

/**
 * Sanitiza string (remove caracteres perigosos)
 */
export function sanitizarString(str: string): string {
  return str
    .replace(/[<>\"']/g, '')
    .trim();
}

/**
 * Limpa CPF (remove caracteres especiais)
 */
export function limparCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

/**
 * Limpa telefone (remove caracteres especiais)
 */
export function limparTelefone(telefone: string): string {
  return telefone.replace(/\D/g, '');
}

/**
 * Formata CPF
 */
export function formatarCPF(cpf: string): string {
  const cpfLimpo = limparCPF(cpf);
  return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata telefone
 */
export function formatarTelefone(telefone: string): string {
  const telefoneLimpo = limparTelefone(telefone);
  if (telefoneLimpo.length === 11) {
    return telefoneLimpo.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return telefoneLimpo.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
}
