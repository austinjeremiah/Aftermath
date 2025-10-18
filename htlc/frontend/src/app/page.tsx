// src/app/page.tsx
'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const UniversalHTLC = dynamic(() => import('@/components/UniversalHTLC'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center border border-white/20">
        <Loader2 className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-spin" />
        <p className="text-gray-300">Loading HTLC...</p>
      </div>
    </div>
  )
})

export default function Home() {
  return <UniversalHTLC />
}