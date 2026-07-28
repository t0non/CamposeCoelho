/**
 * Formata um número como moeda brasileira (BRL).
 */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/**
 * Formata CNPJ com máscara: XX.XXX.XXX/XXXX-XX
 */
export function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return cnpj
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5',
  )
}

/**
 * Remove máscara do CNPJ.
 */
export function cleanCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}

/**
 * Formata telefone com máscara: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  }
  if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
  }
  return phone
}

/**
 * Formata CEP: XXXXX-XXX
 */
export function formatZipCode(zip: string): string {
  const digits = zip.replace(/\D/g, '')
  if (digits.length !== 8) return zip
  return digits.replace(/^(\d{5})(\d{3})$/, '$1-$2')
}

/**
 * Formata data no padrão brasileiro: DD/MM/YYYY
 */
export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(dateString))
}

/**
 * Formata data com hora: DD/MM/YYYY às HH:mm
 */
export function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(new Date(dateString))
    .replace(',', ' às')
}

/**
 * Trunca texto com reticências.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '…'
}

/**
 * Gera slug a partir de uma string.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}
