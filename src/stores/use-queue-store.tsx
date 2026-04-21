import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export type TicketType = 'NORMAL' | 'PREFERENCIAL'
export type TicketStatus = 'WAITING' | 'CALLED' | 'COMPLETED'

export interface Ticket {
  id: string
  number: string
  type: TicketType
  status: TicketStatus
  createdAt: Date
  calledAt?: Date
  completedAt?: Date
  desk?: string
}

interface QueueState {
  tickets: Ticket[]
  currentCall: Ticket | null
  generateTicket: (type: TicketType) => Promise<Ticket | null>
  callNext: (desk: string) => Promise<void>
  callSpecific: (desk: string, ticketId: string) => Promise<void>
  repeatCall: () => void
  completeTicket: (id: string) => Promise<void>
  getWaitingCount: (type: TicketType) => number
  history: Ticket[]
  callTriggerCounter: number
}

const QueueContext = createContext<QueueState | null>(null)

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [currentCall, setCurrentCall] = useState<Ticket | null>(null)
  const [callTriggerCounter, setCallTriggerCounter] = useState(0)
  const { toast } = useToast()

  const fetchTickets = async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching tickets:', error)
      return
    }

    const formatted: Ticket[] = data.map((t) => ({
      id: t.id,
      number: t.number,
      type: t.type as TicketType,
      status: t.status as TicketStatus,
      createdAt: new Date(t.created_at),
      calledAt: t.called_at ? new Date(t.called_at) : undefined,
      completedAt: t.completed_at ? new Date(t.completed_at) : undefined,
      desk: t.desk || undefined,
    }))

    setTickets(formatted)
  }

  useEffect(() => {
    fetchTickets()

    supabase.removeChannel(supabase.channel('public:tickets'))

    const channel = supabase
      .channel('public:tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, (payload) => {
        fetchTickets()

        if (payload.eventType === 'UPDATE') {
          const newRecord = payload.new as any
          const oldRecord = payload.old as any

          if (newRecord.status === 'CALLED' && oldRecord.status === 'WAITING') {
            setCurrentCall({
              id: newRecord.id,
              number: newRecord.number,
              type: newRecord.type as TicketType,
              status: newRecord.status as TicketStatus,
              createdAt: new Date(newRecord.created_at),
              calledAt: new Date(newRecord.called_at),
              desk: newRecord.desk,
            })
            setCallTriggerCounter((prev) => prev + 1)
          }
        }
      })
      .on('broadcast', { event: 'repeat-call' }, (payload) => {
        if (payload.payload.ticket) {
          setCurrentCall({
            ...payload.payload.ticket,
            createdAt: new Date(payload.payload.ticket.createdAt),
            calledAt: payload.payload.ticket.calledAt
              ? new Date(payload.payload.ticket.calledAt)
              : undefined,
            completedAt: payload.payload.ticket.completedAt
              ? new Date(payload.payload.ticket.completedAt)
              : undefined,
          })
          setCallTriggerCounter((prev) => prev + 1)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const getNextNumber = useCallback(
    (type: TicketType) => {
      const today = new Date().toDateString()
      const todayTickets = tickets.filter(
        (t) => t.type === type && t.createdAt.toDateString() === today,
      )
      const prefix = type === 'NORMAL' ? 'N' : 'P'
      const nextNum = todayTickets.length + 1
      return `${prefix}${String(nextNum).padStart(3, '0')}`
    },
    [tickets],
  )

  const generateTicket = useCallback(
    async (type: TicketType) => {
      const number = getNextNumber(type)

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          number,
          type,
          status: 'WAITING',
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        toast({ title: 'Erro ao gerar senha', description: error.message, variant: 'destructive' })
        return null
      }

      return {
        id: data.id,
        number: data.number,
        type: data.type as TicketType,
        status: data.status as TicketStatus,
        createdAt: new Date(data.created_at),
      }
    },
    [getNextNumber, toast],
  )

  const callTicketAction = useCallback(
    async (ticket: Ticket, desk: string) => {
      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'CALLED',
          called_at: new Date().toISOString(),
          desk,
        })
        .eq('id', ticket.id)

      if (error) {
        toast({ title: 'Erro ao chamar senha', description: error.message, variant: 'destructive' })
      }
    },
    [toast],
  )

  const callNext = useCallback(
    async (desk: string) => {
      const waitingPref = tickets.filter((t) => t.status === 'WAITING' && t.type === 'PREFERENCIAL')
      const waitingNormal = tickets.filter((t) => t.status === 'WAITING' && t.type === 'NORMAL')

      const nextTicket =
        waitingPref.length > 0 ? waitingPref[0] : waitingNormal.length > 0 ? waitingNormal[0] : null

      if (nextTicket) {
        await callTicketAction(nextTicket, desk)
      }
    },
    [tickets, callTicketAction],
  )

  const callSpecific = useCallback(
    async (desk: string, ticketId: string) => {
      const ticket = tickets.find((t) => t.id === ticketId && t.status === 'WAITING')
      if (ticket) {
        await callTicketAction(ticket, desk)
      }
    },
    [tickets, callTicketAction],
  )

  const repeatCall = useCallback(() => {
    if (currentCall) {
      setCallTriggerCounter((prev) => prev + 1)
      supabase.channel('public:tickets').send({
        type: 'broadcast',
        event: 'repeat-call',
        payload: { ticket: currentCall },
      })
    }
  }, [currentCall])

  const completeTicket = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) {
        toast({ title: 'Erro ao finalizar', description: error.message, variant: 'destructive' })
      } else {
        if (currentCall?.id === id) {
          setCurrentCall(null)
        }
      }
    },
    [currentCall, toast],
  )

  const getWaitingCount = useCallback(
    (type: TicketType) => {
      return tickets.filter((t) => t.status === 'WAITING' && t.type === type).length
    },
    [tickets],
  )

  const history = useMemo(() => {
    return tickets
      .filter((t) => t.status === 'CALLED' || t.status === 'COMPLETED')
      .filter((t) => t.calledAt)
      .sort((a, b) => b.calledAt!.getTime() - a.calledAt!.getTime())
  }, [tickets])

  const value = {
    tickets,
    currentCall,
    generateTicket,
    callNext,
    callSpecific,
    repeatCall,
    completeTicket,
    getWaitingCount,
    history,
    callTriggerCounter,
  }

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>
}

export default function useQueueStore() {
  const context = useContext(QueueContext)
  if (!context) {
    throw new Error('useQueueStore must be used within a QueueProvider')
  }
  return context
}
