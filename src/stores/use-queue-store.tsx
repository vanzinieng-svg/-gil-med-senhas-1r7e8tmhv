import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/types'

type Ticket = Database['public']['Tables']['tickets']['Row']

interface QueueContextType {
  tickets: Ticket[]
  loading: boolean
  addTicket: (type: 'NORMAL' | 'PREFERENCIAL') => Promise<void>
  callTicket: (id: string, desk: string) => Promise<void>
  callNext: (desk: string, type?: 'NORMAL' | 'PREFERENCIAL') => Promise<void>
  completeTicket: (id: string) => Promise<void>
  repeatTicket: (id: string) => Promise<void>
}

const QueueContext = createContext<QueueContextType | undefined>(undefined)

export const useQueue = () => {
  const context = useContext(QueueContext)
  if (!context) throw new Error('useQueue must be used within a QueueProvider')
  return context
}

export default useQueue

export const QueueProvider = ({ children }: { children: ReactNode }) => {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTickets = async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })

    if (!error && data) {
      setTickets(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    let isMounted = true
    let activeChannel: ReturnType<typeof supabase.channel> | null = null

    fetchTickets()

    const setupRealtime = async () => {
      // Sincronização Atômica e Limpeza de Conexão:
      // Garante que canais antigos sejam totalmente encerrados antes de iniciar um novo,
      // prevenindo o erro "cannot add postgres_changes callbacks... after subscribe()".
      const existingChannels = supabase.getChannels()
      const ticketChannels = existingChannels.filter((c) => c.topic.includes('tickets'))

      for (const c of ticketChannels) {
        await supabase.removeChannel(c)
      }

      if (!isMounted) return

      // Cria um ID de canal único para evitar colisões
      const channelId = `tickets_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      activeChannel = supabase.channel(channelId)

      // Registra os callbacks estritamente ANTES do subscribe
      activeChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
          if (isMounted) fetchTickets()
        })
        .subscribe()
    }

    setupRealtime()

    return () => {
      isMounted = false
      if (activeChannel) {
        supabase.removeChannel(activeChannel)
      } else {
        // Fallback: se o componente for desmontado antes de finalizar a configuração
        supabase.getChannels().forEach((c) => {
          if (c.topic.includes('tickets')) supabase.removeChannel(c)
        })
      }
    }
  }, [])

  const addTicket = async (type: 'NORMAL' | 'PREFERENCIAL') => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count, error } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())
      .eq('type', type)

    if (error) {
      console.error('Error generating ticket number:', error)
      return
    }

    const prefix = type === 'PREFERENCIAL' ? 'P' : 'N'
    const number = `${prefix}${String((count || 0) + 1).padStart(3, '0')}`

    await supabase.from('tickets').insert({
      number,
      type,
      status: 'WAITING',
    })
  }

  const callTicket = async (id: string, desk: string) => {
    await supabase
      .from('tickets')
      .update({
        status: 'CALLED',
        desk,
        called_at: new Date().toISOString(),
      })
      .eq('id', id)
  }

  const callNext = async (desk: string, type?: 'NORMAL' | 'PREFERENCIAL') => {
    let query = supabase
      .from('tickets')
      .select('*')
      .eq('status', 'WAITING')
      .order('created_at', { ascending: true })

    if (type) {
      query = query.eq('type', type)
    }

    const { data } = await query.limit(1)

    if (data && data.length > 0) {
      await callTicket(data[0].id, desk)
    }
  }

  const completeTicket = async (id: string) => {
    await supabase
      .from('tickets')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
  }

  const repeatTicket = async (id: string) => {
    // Updating called_at forces the Realtime listener to trigger an update
    // for the call panel, making the alert sound play again
    await supabase
      .from('tickets')
      .update({
        called_at: new Date().toISOString(),
      })
      .eq('id', id)
  }

  return (
    <QueueContext.Provider
      value={{
        tickets,
        loading,
        addTicket,
        callTicket,
        callNext,
        completeTicket,
        repeatTicket,
      }}
    >
      {children}
    </QueueContext.Provider>
  )
}
