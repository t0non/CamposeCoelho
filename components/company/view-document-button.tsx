'use client'

import { useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getDocumentSignedUrlAction } from '@/app/actions/company'

interface ViewDocumentButtonProps {
  filePath: string
}

export function ViewDocumentButton({ filePath }: ViewDocumentButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleOpen = async () => {
    setLoading(true)
    try {
      const url = await getDocumentSignedUrlAction(filePath, 3600)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err: any) {
      alert(err.message || 'Não foi possível visualizar o arquivo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleOpen}
      disabled={loading}
      className="text-xs font-semibold"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
      ) : (
        <ExternalLink className="h-3.5 w-3.5 mr-1 text-blue-600" />
      )}
      <span>Visualizar</span>
    </Button>
  )
}
