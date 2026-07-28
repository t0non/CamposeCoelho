'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function LogoutButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  return (
    <Button
      variant="ghost"
      onClick={handleLogout}
      loading={loading}
      fullWidth
      className="text-gray-600 hover:text-red-600"
    >
      <LogOut className="h-4 w-4 mr-2" />
      Sair da Conta
    </Button>
  )
}
