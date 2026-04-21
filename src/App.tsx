import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Loader2 } from 'lucide-react'

import Layout from './components/Layout'
import Index from './pages/Index'
import NotFound from './pages/NotFound'
import Totem from './pages/Totem'
import CallPanel from './pages/CallPanel'
import Attendant from './pages/Attendant'
import Reports from './pages/Reports'
import Login from './pages/Login'

import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { QueueProvider } from '@/stores/use-queue-store'

const ProtectedRoutes = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <QueueProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Index />} />
          <Route path="/totem" element={<Totem />} />
          <Route path="/painel" element={<CallPanel />} />
          <Route path="/atendente" element={<Attendant />} />
          <Route path="/relatorios" element={<Reports />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </QueueProvider>
  )
}

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ProtectedRoutes />
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
