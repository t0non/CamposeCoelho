import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { confirmation_text } = await request.json()

    if (confirmation_text !== 'REMOVER TODOS OS PRODUTOS') {
      return NextResponse.json({ error: 'Texto de confirmação incorreto' }, { status: 400 })
    }

    const { data, error } = await supabase.rpc('archive_all_catalog_products_atomic', {
      p_confirmation_text: confirmation_text
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)

  } catch (error: unknown) {
    console.error('Archive API Error:', error)
    const message = error instanceof Error ? error.message : 'Erro interno no servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
