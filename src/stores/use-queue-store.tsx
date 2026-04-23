import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'

export interface Ticket {
  id: string
  number: string
  type: 'NORMAL' | 'PREFERENCIAL'
  status: 'WAITING' | 'CALLED' | 'COMPLETED'
  createdAt: Date
  calledAt: Date | null
  completedAt: Date | null
  desk: string | null
}

interface QueueContextType {
  tickets: Ticket[]
  history: Ticket[]
  currentCall: Ticket | null
  callTriggerCounter: number
  loading: boolean
  generateTicket: (type: 'NORMAL' | 'PREFERENCIAL') => Promise<Ticket | null>
  callSpecific: (desk: string, id: string) => Promise<void>
  callNext: (desk: string) => Promise<void>
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

const mapTicket = (row: any): Ticket => ({
  id: row.id,
  number: row.number,
  type: row.type,
  status: row.status,
  createdAt: new Date(row.created_at),
  calledAt: row.called_at ? new Date(row.called_at) : null,
  completedAt: row.completed_at ? new Date(row.completed_at) : null,
  desk: row.desk,
})

export const QueueProvider = ({ children }: { children: ReactNode }) => {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [history, setHistory] = useState<Ticket[]>([])
  const [currentCall, setCurrentCall] = useState<Ticket | null>(null)
  const [callTriggerCounter, setCallTriggerCounter] = useState(0)
  const [loading, setLoading] = useState(true)

  const currentCallRef = useRef<Ticket | null>(null)

  const fetchTickets = async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })

    if (!error && data) {
      const mapped = data.map(mapTicket)
      setTickets(mapped)

      const called = mapped
        .filter((t) => t.calledAt)
        .sort((a, b) => b.calledAt!.getTime() - a.calledAt!.getTime())

      setHistory(called)

      if (called.length > 0) {
        setCurrentCall((prev) => {
          if (!prev) {
            currentCallRef.current = called[0]
            return called[0]
          }
          return prev
        })
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    let isMounted = true
    let activeChannel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      await fetchTickets()

      if (!isMounted) return

      // Previne duplicação de canais
      const existingChannels = supabase.getChannels().filter((c) => c.topic.includes('tickets'))
      for (const c of existingChannels) {
        await supabase.removeChannel(c)
      }

      if (!isMounted) return

      const channelId = `tickets_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      activeChannel = supabase.channel(channelId)

      activeChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, (payload) => {
          if (!isMounted) return

          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newRecord = mapTicket(payload.new)

            // Tratamento otimizado usando referência para evitar falhas na fila de state do React
            if (newRecord.status === 'CALLED') {
              const prev = currentCallRef.current
              const isSameTicket = prev?.id === newRecord.id
              const isNewTime = prev?.calledAt?.getTime() !== newRecord.calledAt?.getTime()

              if (!prev || !isSameTicket || isNewTime) {
                setCurrentCall(newRecord)
                currentCallRef.current = newRecord
                setCallTriggerCounter((c) => c + 1)
              }
            }
          }
          fetchTickets()
        })
        .subscribe()
    }

    init()

    return () => {
      isMounted = false
      if (activeChannel) {
        supabase.removeChannel(activeChannel)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const generateTicket = async (type: 'NORMAL' | 'PREFERENCIAL') => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count, error } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())
      .eq('type', type)

    if (error) {
      console.error('Error generating ticket number:', error)
      return null
    }

    const prefix = type === 'PREFERENCIAL' ? 'P' : 'N'
    const number = `${prefix}${String((count || 0) + 1).padStart(3, '0')}`

    const { data, error: insertError } = await supabase
      .from('tickets')
      .insert({
        number,
        type,
        status: 'WAITING',
      })
      .select()
      .single()

    if (insertError || !data) return null
    return mapTicket(data)
  }

  const callSpecific = async (desk: string, id: string) => {
    await supabase
      .from('tickets')
      .update({
        status: 'CALLED',
        desk,
        called_at: new Date().toISOString(),
      })
      .eq('id', id)
  }

  const callNext = async (desk: string) => {
    const nextPref = tickets.find((t) => t.status === 'WAITING' && t.type === 'PREFERENCIAL')
    const nextNormal = tickets.find((t) => t.status === 'WAITING' && t.type === 'NORMAL')

    const next = nextPref || nextNormal

    if (next) {
      await callSpecific(desk, next.id)
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
        history,
        currentCall,
        callTriggerCounter,
        loading,
        generateTicket,
        callSpecific,
        callNext,
        completeTicket,
        repeatTicket,
      }}
    >
      {children}
    </QueueContext.Provider>
  )
}
