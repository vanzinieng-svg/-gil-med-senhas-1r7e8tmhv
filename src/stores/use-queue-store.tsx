import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { RealtimeChannel } from '@supabase/supabase-js'

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

  const channelRef = useRef<RealtimeChannel | null>(null)

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

    const lastCalled = formatted
      .filter((t) => t.status === 'CALLED' && t.calledAt)
      .sort((a, b) => b.calledAt!.getTime() - a.calledAt!.getTime())[0]

    if (lastCalled) {
      setCurrentCall(lastCalled)
    }
  }

  useEffect(() => {
    fetchTickets()

    supabase.getChannels().forEach((c) => {
      if (c.topic === 'public:tickets') {
        supabase.removeChannel(c)
      }
    })

    const channel = supabase.channel('public:tickets', {
      config: { broadcast: { self: false } },
    })

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newRecord = payload.new as any
          setTickets((prev) => {
            if (prev.some((t) => t.id === newRecord.id)) return prev
            return [
              ...prev,
              {
                id: newRecord.id,
                number: newRecord.number,
                type: newRecord.type as TicketType,
                status: newRecord.status as TicketStatus,
                createdAt: new Date(newRecord.created_at),
                calledAt: newRecord.called_at ? new Date(newRecord.called_at) : undefined,
                completedAt: newRecord.completed_at ? new Date(newRecord.completed_at) : undefined,
                desk: newRecord.desk || undefined,
              },
            ]
          })
        } else if (payload.eventType === 'UPDATE') {
          const newRecord = payload.new as any

          setTickets((prev) =>
            prev.map((t) =>
              t.id === newRecord.id
                ? {
                    ...t,
                    status: newRecord.status as TicketStatus,
                    calledAt: newRecord.called_at ? new Date(newRecord.called_at) : undefined,
                    completedAt: newRecord.completed_at
                      ? new Date(newRecord.completed_at)
                      : undefined,
                    desk: newRecord.desk || undefined,
                  }
                : t,
            ),
          )
        } else if (payload.eventType === 'DELETE') {
          setTickets((prev) => prev.filter((t) => t.id !== payload.old.id))
        }
      })
      .on('broadcast', { event: 'call-ticket' }, (payload) => {
        if (payload.payload.ticket) {
          const ticket = payload.payload.ticket
          setCurrentCall({
            ...ticket,
            createdAt: new Date(ticket.createdAt),
            calledAt: ticket.calledAt ? new Date(ticket.calledAt) : undefined,
            completedAt: ticket.completedAt ? new Date(ticket.completedAt) : undefined,
          })
          setCallTriggerCounter((c) => c + 1)

          setTickets((prev) =>
            prev.map((t) =>
              t.id === ticket.id
                ? {
                    ...t,
                    status: 'CALLED',
                    desk: ticket.desk,
                    calledAt: ticket.calledAt ? new Date(ticket.calledAt) : undefined,
                  }
                : t,
            ),
          )
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
      .on('broadcast', { event: 'new-ticket' }, (payload) => {
        if (payload.payload.ticket) {
          const newRecord = payload.payload.ticket
          setTickets((prev) => {
            if (prev.some((t) => t.id === newRecord.id)) return prev
            return [
              ...prev,
              {
                ...newRecord,
                createdAt: new Date(newRecord.createdAt),
                calledAt: newRecord.calledAt ? new Date(newRecord.calledAt) : undefined,
                completedAt: newRecord.completedAt ? new Date(newRecord.completedAt) : undefined,
              },
            ]
          })
        }
      })
      .on('broadcast', { event: 'complete-ticket' }, (payload) => {
        if (payload.payload.id) {
          const id = payload.payload.id
          setTickets((prev) =>
            prev.map((t) =>
              t.id === id
                ? {
                    ...t,
                    status: 'COMPLETED',
                    completedAt: new Date(),
                  }
                : t,
            ),
          )

          setCurrentCall((curr) => {
            if (curr?.id === id) return null
            return curr
          })
        }
      })
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
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
      const now = new Date()

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          number,
          type,
          status: 'WAITING',
          created_at: now.toISOString(),
        })
        .select()
        .single()

      if (error) {
        toast({ title: 'Erro ao gerar senha', description: error.message, variant: 'destructive' })
        return null
      }

      const newTicket: Ticket = {
        id: data.id,
        number: data.number,
        type: data.type as TicketType,
        status: data.status as TicketStatus,
        createdAt: new Date(data.created_at),
      }

      setTickets((prev) => {
        if (prev.some((t) => t.id === newTicket.id)) return prev
        return [...prev, newTicket]
      })

      channelRef.current?.send({
        type: 'broadcast',
        event: 'new-ticket',
        payload: { ticket: newTicket },
      })

      return newTicket
    },
    [getNextNumber, toast],
  )

  const callTicketAction = useCallback(
    async (ticket: Ticket, desk: string) => {
      const now = new Date()

      const updatedTicket: Ticket = {
        ...ticket,
        status: 'CALLED',
        desk,
        calledAt: now,
      }

      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? updatedTicket : t)))
      setCurrentCall(updatedTicket)
      setCallTriggerCounter((prev) => prev + 1)

      channelRef.current?.send({
        type: 'broadcast',
        event: 'call-ticket',
        payload: { ticket: updatedTicket },
      })

      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'CALLED',
          called_at: now.toISOString(),
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
      channelRef.current?.send({
        type: 'broadcast',
        event: 'repeat-call',
        payload: { ticket: currentCall },
      })
    }
  }, [currentCall])

  const completeTicket = useCallback(
    async (id: string) => {
      const now = new Date()

      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'COMPLETED', completedAt: now } : t)),
      )
      if (currentCall?.id === id) {
        setCurrentCall(null)
      }

      channelRef.current?.send({
        type: 'broadcast',
        event: 'complete-ticket',
        payload: { id },
      })

      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'COMPLETED',
          completed_at: now.toISOString(),
        })
        .eq('id', id)

      if (error) {
        toast({ title: 'Erro ao finalizar', description: error.message, variant: 'destructive' })
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
