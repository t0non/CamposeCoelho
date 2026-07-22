/**
  * Validador estrito de dígitos verificadores do CNPJ (Algoritmo oficial da Receita Federal).
  */
export function validateCNPJ(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, '')

  if (clean.length !== 14) return false
  if (/^(\d)\1{13}$/.test(clean)) return false // Rejeita sequências repetidas (ex: 11111111111111)

  let size = clean.length - 2
  let numbers = clean.substring(0, size)
  const digits = clean.substring(size)
  let sum = 0
  let pos = size - 7

  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--
    if (pos < 2) pos = 9
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== Number(digits.charAt(0))) return false

  size = size + 1
  numbers = clean.substring(0, size)
  sum = 0
  pos = size - 7

  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--
    if (pos < 2) pos = 9
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== Number(digits.charAt(1))) return false

  return true
}

/**
 * Validador estrito de dígitos verificadores do CPF.
 */
export function validateCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '')

  if (clean.length !== 11) return false
  if (/^(\d)\1{10}$/.test(clean)) return false // Rejeita sequências repetidas (ex: 00000000000)

  let sum = 0
  let remainder: number

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(clean.substring(i - 1, i), 10) * (11 - i)
  }

  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(clean.substring(9, 10), 10)) return false

  sum = 0
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(clean.substring(i - 1, i), 10) * (12 - i)
  }

  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(clean.substring(10, 11), 10)) return false

  return true
}

// Formatadores de Máscara Visual

export function maskCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

export function maskCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  return digits.replace(/^(\d{5})(\d)/, '$1-$2')
}
