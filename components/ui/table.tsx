import React from 'react'

export function Table({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className="w-full overflow-x-auto rounded-md border border-gray-200">
      <table className={`w-full text-sm text-left text-gray-700 ${className}`}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
      {children}
    </thead>
  )
}

export function TableRow({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-50 transition-colors last:border-0 ${className}`}>
      {children}
    </tr>
  )
}

export function TableHead({ children, className = '', ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th scope="col" className={`px-6 py-3 font-medium ${className}`} {...props}>
      {children}
    </th>
  )
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>
}

export function TableCell({ children, className = '', ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-6 py-4 align-middle ${className}`} {...props}>
      {children}
    </td>
  )
}
