import { useState, useEffect } from 'react'
import useQueueStore, { Ticket } from '@/stores/use-queue-store'
import { Settings2, BellRing, CheckCircle2, UserCheck, Users, RefreshCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const Attendant = () => {
  const {
    tickets,
    currentCall,
    callNext,
    callSpecific,
    repeatCall,
    completeTicket,
    getWaitingCount,
  } = useQueueStore()
  const [deskNumber, setDeskNumber] = useState('Guichê 01')
  const { toast } = useToast()

  // Filter queues
  const waitingNormal = tickets.filter((t) => t.status === 'WAITING' && t.type === 'NORMAL')
  const waitingPref = tickets.filter((t) => t.status === 'WAITING' && t.type === 'PREFERENCIAL')
  const hasWaiting = waitingNormal.length > 0 || waitingPref.length > 0

  // Local state to track the ticket currently handled by THIS desk
  const [localActiveTicket, setLocalActiveTicket] = useState<Ticket | null>(null)

  // Sync localActiveTicket when currentCall changes and belongs to this desk
  useEffect(() => {
    if (currentCall?.desk === deskNumber && currentCall.status === 'CALLED') {
      setLocalActiveTicket(currentCall)
    } else if (currentCall === null) {
      // If completed globally and currentCall is null
      if (
        localActiveTicket &&
        tickets.find((t) => t.id === localActiveTicket.id)?.status === 'COMPLETED'
      ) {
        setLocalActiveTicket(null)
      }
    }
  }, [currentCall, deskNumber, tickets])

  const handleCallNext = () => {
    if (!deskNumber.trim()) {
      toast({
        title: 'Atenção',
        description: 'Defina o nome/número do guichê antes de chamar.',
        variant: 'destructive',
      })
      return
    }

    // Complete existing if forgot
    if (localActiveTicket) {
      completeTicket(localActiveTicket.id)
    }

    callNext(deskNumber)
  }

  const handleCallSpecific = (id: string) => {
    if (!deskNumber.trim()) {
      toast({
        title: 'Atenção',
        description: 'Defina o guichê antes de chamar.',
        variant: 'destructive',
      })
      return
    }
    if (localActiveTicket) {
      completeTicket(localActiveTicket.id)
    }
    callSpecific(deskNumber, id)
  }

  const handleComplete = () => {
    if (localActiveTicket) {
      completeTicket(localActiveTicket.id)
      setLocalActiveTicket(null)
      toast({ title: 'Sucesso', description: 'Atendimento finalizado com sucesso.' })
    }
  }

  const QueueList = ({
    items,
    title,
    isWarning = false,
  }: {
    items: Ticket[]
    title: string
    isWarning?: boolean
  }) => (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3 border-b bg-slate-50">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            {title}
          </CardTitle>
          <Badge
            variant={isWarning ? 'destructive' : 'secondary'}
            className={isWarning ? 'bg-warning text-warning-foreground hover:bg-warning' : ''}
          >
            {items.length} aguardando
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <ScrollArea className="h-[300px] w-full">
          {items.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground p-8 text-center">
              Fila vazia no momento.
            </div>
          ) : (
            <div className="flex flex-col p-2 gap-1">
              {items.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'font-mono font-bold text-lg',
                        isWarning ? 'text-warning' : 'text-primary',
                      )}
                    >
                      {t.number}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Chegou:{' '}
                      {t.createdAt.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => handleCallSpecific(t.id)}>
                        <BellRing className="w-4 h-4 text-primary" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Chamar esta senha</TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Painel do Atendente</h1>
          <p className="text-muted-foreground">Gerencie as chamadas e filas do seu guichê.</p>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 pr-6 rounded-full shadow-sm border">
          <div className="bg-primary/10 p-2 rounded-full">
            <Settings2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Identificação:</span>
            <Input
              value={deskNumber}
              onChange={(e) => setDeskNumber(e.target.value)}
              className="w-32 h-8 border-none bg-slate-50 focus-visible:ring-1"
              placeholder="Ex: Guichê 01"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Queues */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <QueueList items={waitingPref} title="Fila Preferencial" isWarning />
          <QueueList items={waitingNormal} title="Fila Normal" />
        </div>

        {/* Right Col: Current Actions */}
        <div className="flex flex-col gap-6">
          <Card className="border-2 border-primary/20 shadow-md">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle>Ação Principal</CardTitle>
              <CardDescription>
                O sistema prioriza automaticamente senhas preferenciais.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Button
                onClick={handleCallNext}
                disabled={!hasWaiting && !localActiveTicket}
                size="lg"
                className={cn(
                  'w-full h-16 text-lg relative overflow-hidden',
                  hasWaiting && !localActiveTicket ? 'animate-pulse-ring' : '',
                )}
              >
                <BellRing className="w-6 h-6 mr-3" />
                {localActiveTicket ? 'Finalizar Atual e Chamar Próximo' : 'Chamar Próximo'}
              </Button>
            </CardContent>
          </Card>

          <Card
            className={cn(
              'transition-all duration-300',
              localActiveTicket ? 'border-warning/50 shadow-lg bg-warning/5' : '',
            )}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Em Atendimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {localActiveTicket ? (
                <div className="text-center animate-fade-in">
                  <Badge variant="outline" className="mb-4">
                    {localActiveTicket.type === 'NORMAL'
                      ? 'Atendimento Normal'
                      : 'Atendimento Preferencial'}
                  </Badge>
                  <div className="text-6xl font-mono font-bold text-slate-900 mb-6">
                    {localActiveTicket.number}
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={repeatCall}>
                      <RefreshCcw className="w-4 h-4 mr-2" /> Repetir
                    </Button>
                    <Button
                      variant="default"
                      className="flex-1 bg-success hover:bg-success/90"
                      onClick={handleComplete}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Finalizar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum paciente em atendimento neste guichê.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Attendant
