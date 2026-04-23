import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/types'

type DbTicket = Database['public']['Tables']['tickets']['Row']

export type QueueTicket = {
  id: string
  number: string
  type: string
  status: string
  desk: string | null
  calledAt: Date | null
  createdAt: Date
}

const mapTicket = (t: DbTicket): QueueTicket => ({
  id: t.id,
  number: t.number,
  type: t.type,
  status: t.status,
  desk: t.desk,
  calledAt: t.called_at ? new Date(t.called_at) : null,
  createdAt: new Date(t.created_at),
})

interface QueueStore {
  currentCall: QueueTicket | null
  history: QueueTicket[]
  callTriggerCounter: number
  fetchTickets: () => Promise<void>
}

const QueueContext = createContext<QueueStore | undefined>(undefined)

export const QueueProvider = ({ children }: { children: ReactNode }) => {
  const [currentCall, setCurrentCall] = useState<QueueTicket | null>(null)
  const [history, setHistory] = useState<QueueTicket[]>([])
  const [callTriggerCounter, setCallTriggerCounter] = useState(0)

  const fetchTickets = useCallback(async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .in('status', ['CALLED', 'COMPLETED'])
      .order('called_at', { ascending: false })
      .limit(10)

    if (!error && data && data.length > 0) {
      const mapped = data.map(mapTicket)
      const called = mapped.filter((t) => t.status === 'CALLED')
      setCurrentCall(called.length > 0 ? called[0] : null)
      setHistory(mapped)
    }
  }, [])

  useEffect(() => {
    fetchTickets()

    // CRITICAL FIX: All .on() listeners MUST be attached before calling .subscribe()
    // to prevent the "cannot add postgres_changes callbacks... after subscribe()" error.
    const channel = supabase
      .channel('public:tickets')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tickets' },
        (payload) => {
          const newTicket = mapTicket(payload.new as DbTicket)

          if (newTicket.status === 'CALLED') {
            setCurrentCall(newTicket)
            setHistory((prev) => {
              const filtered = prev.filter((t) => t.id !== newTicket.id)
              return [newTicket, ...filtered].slice(0, 10)
            })
            // Incrementing this triggers the alert in CallPanel (even for "Repetir")
            setCallTriggerCounter((c) => c + 1)
          } else if (newTicket.status === 'COMPLETED') {
            setCurrentCall((current) => (current?.id === newTicket.id ? null : current))
            setHistory((prev) => {
              const exists = prev.find((t) => t.id === newTicket.id)
              if (exists) {
                return prev.map((t) => (t.id === newTicket.id ? newTicket : t))
              }
              return [newTicket, ...prev].slice(0, 10)
            })
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tickets' },
        (payload) => {
          const newTicket = mapTicket(payload.new as DbTicket)
          if (newTicket.status === 'CALLED') {
            setCurrentCall(newTicket)
            setHistory((prev) => [newTicket, ...prev].slice(0, 10))
            setCallTriggerCounter((c) => c + 1)
          }
        },
      )

    // Now it's safe to subscribe
    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchTickets])

  return React.createElement(
    QueueContext.Provider,
    { value: { currentCall, history, callTriggerCounter, fetchTickets } },
    children,
  )
}

export const useQueueStore = () => {
  const context = useContext(QueueContext)
  if (!context) throw new Error('useQueueStore must be used within QueueProvider')
  return context
}

export default useQueueStore
