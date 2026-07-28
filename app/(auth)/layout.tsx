import type { ReactNode } from 'react'

/**
 * Layout do grupo de autenticação.
 * Centraliza o formulário na tela — sem header/footer da loja.
 * Aninhado dentro do RootLayout global.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
