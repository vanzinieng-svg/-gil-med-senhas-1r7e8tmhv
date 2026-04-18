import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'

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
  generateTicket: (type: TicketType) => Ticket
  callNext: (desk: string) => void
  callSpecific: (desk: string, ticketId: string) => void
  repeatCall: () => void
  completeTicket: (id: string) => void
  getWaitingCount: (type: TicketType) => number
  history: Ticket[]
  callTriggerCounter: number // Used to trigger animations on repeat calls
}

const QueueContext = createContext<QueueState | null>(null)

// Generate some initial mock data for reports to not be empty
const generateMockData = (): Ticket[] => {
  const mock: Ticket[] = []
  const now = new Date()
  let normalCount = 1
  let prefCount = 1

  for (let i = 0; i < 25; i++) {
    const isPref = Math.random() > 0.6
    const type: TicketType = isPref ? 'PREFERENCIAL' : 'NORMAL'
    const num = isPref
      ? `P${String(prefCount++).padStart(3, '0')}`
      : `N${String(normalCount++).padStart(3, '0')}`

    const createdAt = new Date(now.getTime() - Math.random() * 1000 * 60 * 60 * 4) // up to 4 hours ago
    const calledAt = new Date(createdAt.getTime() + Math.random() * 1000 * 60 * 15) // wait up to 15 mins
    const completedAt = new Date(calledAt.getTime() + Math.random() * 1000 * 60 * 10) // serve up to 10 mins

    mock.push({
      id: Math.random().toString(36).substring(7),
      number: num,
      type,
      status: 'COMPLETED',
      createdAt,
      calledAt,
      completedAt,
      desk: `Guichê ${Math.floor(Math.random() * 3) + 1}`,
    })
  }

  // Add some waiting
  for (let i = 0; i < 3; i++) {
    mock.push({
      id: Math.random().toString(36).substring(7),
      number: `N${String(normalCount++).padStart(3, '0')}`,
      type: 'NORMAL',
      status: 'WAITING',
      createdAt: new Date(now.getTime() - 1000 * 60 * i),
    })
  }

  mock.push({
    id: Math.random().toString(36).substring(7),
    number: `P${String(prefCount++).padStart(3, '0')}`,
    type: 'PREFERENCIAL',
    status: 'WAITING',
    createdAt: new Date(now.getTime() - 1000 * 60 * 2),
  })

  return mock.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
}

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tickets, setTickets] = useState<Ticket[]>(generateMockData())
  const [currentCall, setCurrentCall] = useState<Ticket | null>(null)
  const [callTriggerCounter, setCallTriggerCounter] = useState(0)

  const getNextNumber = useCallback(
    (type: TicketType) => {
      const todayTickets = tickets.filter(
        (t) => t.type === type && t.createdAt.toDateString() === new Date().toDateString(),
      )
      const prefix = type === 'NORMAL' ? 'N' : 'P'
      const nextNum = todayTickets.length + 1
      return `${prefix}${String(nextNum).padStart(3, '0')}`
    },
    [tickets],
  )

  const generateTicket = useCallback(
    (type: TicketType) => {
      const newTicket: Ticket = {
        id: Math.random().toString(36).substring(7),
        number: getNextNumber(type),
        type,
        status: 'WAITING',
        createdAt: new Date(),
      }
      setTickets((prev) => [...prev, newTicket])
      return newTicket
    },
    [getNextNumber],
  )

  const callTicketAction = useCallback((ticket: Ticket, desk: string) => {
    const updatedTicket: Ticket = { ...ticket, status: 'CALLED', calledAt: new Date(), desk }
    setTickets((prev) => prev.map((t) => (t.id === ticket.id ? updatedTicket : t)))
    setCurrentCall(updatedTicket)
    setCallTriggerCounter((prev) => prev + 1)
  }, [])

  const callNext = useCallback(
    (desk: string) => {
      const waitingPref = tickets.filter((t) => t.status === 'WAITING' && t.type === 'PREFERENCIAL')
      const waitingNormal = tickets.filter((t) => t.status === 'WAITING' && t.type === 'NORMAL')

      // Simple priority logic
      const nextTicket =
        waitingPref.length > 0 ? waitingPref[0] : waitingNormal.length > 0 ? waitingNormal[0] : null

      if (nextTicket) {
        callTicketAction(nextTicket, desk)
      }
    },
    [tickets, callTicketAction],
  )

  const callSpecific = useCallback(
    (desk: string, ticketId: string) => {
      const ticket = tickets.find((t) => t.id === ticketId && t.status === 'WAITING')
      if (ticket) {
        callTicketAction(ticket, desk)
      }
    },
    [tickets, callTicketAction],
  )

  const repeatCall = useCallback(() => {
    if (currentCall) {
      setCallTriggerCounter((prev) => prev + 1)
    }
  }, [currentCall])

  const completeTicket = useCallback(
    (id: string) => {
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'COMPLETED', completedAt: new Date() } : t)),
      )
      if (currentCall?.id === id) {
        setCurrentCall(null)
      }
    },
    [currentCall],
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
      .filter((t) => t.calledAt) // Must have been called
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
