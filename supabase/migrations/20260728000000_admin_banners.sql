-- Adiciona coluna para banner mobile
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS mobile_image_url text;

-- Remove policy antiga 
DROP POLICY IF EXISTS "Banners para todos" ON public.banners;
DROP POLICY IF EXISTS "Leitura de Banners" ON public.banners;
DROP POLICY IF EXISTS "Admin gerencia Banners - Insert" ON public.banners;
DROP POLICY IF EXISTS "Admin gerencia Banners - Update" ON public.banners;
DROP POLICY IF EXISTS "Admin gerencia Banners - Delete" ON public.banners;

-- Recria policies da tabela banners usando a função segura (is_current_user_admin)
CREATE POLICY "Leitura de Banners" 
ON public.banners FOR SELECT 
USING (is_active = true OR public.is_current_user_admin());

CREATE POLICY "Admin gerencia Banners - Insert" 
ON public.banners FOR INSERT 
WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admin gerencia Banners - Update" 
ON public.banners FOR UPDATE 
USING (public.is_current_user_admin());

CREATE POLICY "Admin gerencia Banners - Delete" 
ON public.banners FOR DELETE 
USING (public.is_current_user_admin());

-- Criação do Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'banners',
  'banners',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public, 
  file_size_limit = EXCLUDED.file_size_limit, 
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas de Storage para o bucket banners
DROP POLICY IF EXISTS "Leitura pública de banners" ON storage.objects;
DROP POLICY IF EXISTS "Admins gerenciam imagens de banners - Insert" ON storage.objects;
DROP POLICY IF EXISTS "Admins gerenciam imagens de banners - Update" ON storage.objects;
DROP POLICY IF EXISTS "Admins gerenciam imagens de banners - Delete" ON storage.objects;

CREATE POLICY "Leitura pública de banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'banners');

CREATE POLICY "Admins gerenciam imagens de banners - Insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'banners' AND public.is_current_user_admin());

CREATE POLICY "Admins gerenciam imagens de banners - Update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'banners' AND public.is_current_user_admin());

CREATE POLICY "Admins gerenciam imagens de banners - Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'banners' AND public.is_current_user_admin());
