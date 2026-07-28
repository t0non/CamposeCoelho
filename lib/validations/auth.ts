import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'E-mail é obrigatório')
    .email('E-mail inválido'),
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
    .min(8, 'Senha deve ter no mínimo 8 caracteres'),
})

export const registerSchema = z
  .object({
    // Dados pessoais
    full_name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
    email: z.string().min(1, 'E-mail é obrigatório').email('E-mail inválido'),
    phone: z
      .string()
      .min(10, 'Telefone inválido')
      .max(15, 'Telefone inválido')
      .regex(/^\d+$/, 'Telefone deve conter apenas números'),
    password: z
      .string()
      .min(8, 'Senha deve ter no mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Senha deve ter ao menos uma letra maiúscula')
      .regex(/[0-9]/, 'Senha deve ter ao menos um número'),
    confirm_password: z.string().min(1, 'Confirmação de senha é obrigatória'),

    // Dados da empresa
    cnpj: z
      .string()
      .min(14, 'CNPJ inválido')
      .max(18, 'CNPJ inválido')
      .regex(/[\d.\/\-]+/, 'CNPJ inválido'),
    company_name: z.string().min(3, 'Razão social deve ter no mínimo 3 caracteres'),
    trade_name: z.string().optional(),
    state_registration: z.string().optional(),
    company_email: z
      .string()
      .email('E-mail da empresa inválido')
      .optional()
      .or(z.literal('')),
    company_phone: z
      .string()
      .regex(/^\d+$/, 'Telefone deve conter apenas números')
      .optional()
      .or(z.literal('')),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'As senhas não conferem',
    path: ['confirm_password'],
  })

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'E-mail é obrigatório').email('E-mail inválido'),
})

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Senha deve ter no mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Senha deve ter ao menos uma letra maiúscula')
      .regex(/[0-9]/, 'Senha deve ter ao menos um número'),
    confirm_password: z.string().min(1, 'Confirmação de senha é obrigatória'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'As senhas não conferem',
    path: ['confirm_password'],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
