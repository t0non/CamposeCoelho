'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export async function uploadBannerImage(formData: FormData) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Não autorizado' }
  }

  const file = formData.get('file') as File
  if (!file) {
    return { error: 'Nenhum arquivo enviado' }
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
  const filePath = `images/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('banners')
    .upload(filePath, file)

  if (uploadError) {
    console.error('Upload erro:', uploadError)
    return { error: 'Falha ao fazer upload da imagem' }
  }

  const { data: { publicUrl } } = supabase.storage
    .from('banners')
    .getPublicUrl(filePath)

  return { url: publicUrl }
}

export async function saveBanner(data: {
  id?: string
  title: string
  subtitle?: string | null
  image_url: string
  mobile_image_url?: string | null
  link_url?: string | null
  is_active: boolean
  position: number
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  if (data.id) {
    const { error } = await supabase
      .from('banners')
      .update({
        title: data.title,
        subtitle: data.subtitle,
        image_url: data.image_url,
        mobile_image_url: data.mobile_image_url,
        link_url: data.link_url,
        is_active: data.is_active,
        position: data.position,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.id)
      
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('banners')
      .insert({
        title: data.title,
        subtitle: data.subtitle,
        image_url: data.image_url,
        mobile_image_url: data.mobile_image_url,
        link_url: data.link_url,
        is_active: data.is_active,
        position: data.position
      })
      
    if (error) return { error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/admin/banners')
  return { success: true }
}

export async function deleteBanner(id: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase
    .from('banners')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/admin/banners')
  return { success: true }
}

export async function updateBannerOrder(orderedIds: string[]) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // Simple sequential update for the order
  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from('banners')
      .update({ position: i })
      .eq('id', orderedIds[i])
  }

  revalidatePath('/')
  revalidatePath('/admin/banners')
  return { success: true }
}
