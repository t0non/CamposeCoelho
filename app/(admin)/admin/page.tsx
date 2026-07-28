import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard Admin' }

export default function AdminDashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-500">Placeholder — será implementado na próxima etapa.</p>
    </div>
  )
}
