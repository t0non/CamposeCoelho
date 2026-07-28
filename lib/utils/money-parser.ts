import 'server-only'

/**
 * Parses Brazilian monetary strings (pt-BR) to a safe canonical decimal string.
 * Acceptable formats: "0,01", "1,10", "19,90", "1234,56", "1.234,56", "R$ 1.234,56", "R$1.234,56".
 * Rejects spaces in the middle, multiple dots, negative values, zeros, scientific notation, NaN, Infinity, empty string.
 */
export function parseBrazilianMoney(value: string): string {
  if (!value) {
    throw new Error('Valor monetário não pode ser vazio')
  }

  // 1. Remover prefixo R$ e espaços iniciais/finais
  let sanitized = value.trim()
  if (sanitized.startsWith('R$')) {
    sanitized = sanitized.substring(2).trim()
  }

  // Rejeitar se contiver espaços no meio do valor
  if (/\s/.test(sanitized)) {
    throw new Error('Valor monetário não pode conter espaços internos')
  }

  // 2. Validar o formato pt-BR original (pontos opcionais como milhar, vírgula como decimal com 2 casas)
  // Permite opcionalmente pontos a cada 3 dígitos
  const ptBrPattern = /^(?:[1-9]\d{0,2}(?:\.\d{3})*|0),\d{2}$/
  if (!ptBrPattern.test(sanitized)) {
    throw new Error('Formato monetário inválido. Formato esperado: "1.234,56" ou "19,90"')
  }

  // 3. Remover os separadores de milhar (pontos)
  const canonical = sanitized.replace(/\./g, '').replace(',', '.')

  // 4. Validar a string canônica resultante
  const num = Number(canonical)
  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Valor monetário inválido')
  }

  if (num <= 0) {
    throw new Error('O valor deve ser maior que zero')
  }

  return canonical
}
