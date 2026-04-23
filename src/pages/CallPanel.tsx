import { useEffect, useState, useRef } from 'react'
import useQueueStore from '@/stores/use-queue-store'
import { HeartPulse, Megaphone, Volume2, Play } from 'lucide-react'
import { playDingDong, speakText } from '@/lib/audio'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const CallPanel = () => {
  const { currentCall, history, callTriggerCounter } = useQueueStore()
  const [isStarted, setIsStarted] = useState(false)
  const [isFlashing, setIsFlashing] = useState(false)
  const prevTriggerRef = useRef(callTriggerCounter)

  // Handle incoming calls
  useEffect(() => {
    if (isStarted && callTriggerCounter > prevTriggerRef.current) {
      prevTriggerRef.current = callTriggerCounter

      if (currentCall) {
        setIsFlashing(true)
        playDingDong()

        // Wait for the ding dong to finish before speaking
        const speakTimeout = setTimeout(() => {
          speakText(`Senha ${currentCall.number}. ${currentCall.desk}.`)
        }, 1200)

        const flashTimeout = setTimeout(() => setIsFlashing(false), 3000)

        return () => {
          clearTimeout(speakTimeout)
          clearTimeout(flashTimeout)
        }
      }
    }
  }, [callTriggerCounter, currentCall, isStarted])

  if (!isStarted) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50 text-white">
        <HeartPulse className="w-24 h-24 text-primary mb-8 animate-pulse" />
        <h1 className="text-4xl font-bold mb-4">Painel de Chamada Ágil Med</h1>
        <p className="text-xl text-slate-400 mb-12">
          Clique no botão abaixo para iniciar e permitir os alertas sonoros.
        </p>
        <Button
          size="lg"
          className="text-xl px-12 py-8 rounded-full shadow-lg hover:scale-105 transition-transform"
          onClick={() => setIsStarted(true)}
        >
          <Play className="mr-3 h-8 w-8" /> Iniciar Painel
        </Button>
      </div>
    )
  }

  const recentHistory = history.slice(0, 5) // Excludes currentCall ideally, but history logic includes it.
  // We should filter out the current call from history to avoid duplication on screen
  const displayHistory = history.filter((h) => h.id !== currentCall?.id).slice(0, 5)

  return (
    <div className="w-full h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Top Banner */}
      <div className="bg-primary text-primary-foreground h-20 flex items-center justify-between px-8 shadow-md z-10">
        <div className="flex items-center gap-4">
          <HeartPulse className="w-10 h-10" />
          <h1 className="text-3xl font-bold tracking-tight">Ágil Med</h1>
        </div>
        <div className="flex items-center gap-3 text-primary-foreground/80">
          <Volume2 className="w-6 h-6" />
          <span className="text-xl font-medium">Alertas Sonoros Ativos</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col justify-center items-center p-12 bg-white relative">
          {currentCall ? (
            <div
              className={cn(
                'text-center transition-transform duration-300',
                isFlashing ? 'animate-pulse scale-105' : '',
              )}
            >
              <div className="inline-flex items-center gap-4 px-6 py-2 rounded-full bg-slate-100 text-slate-600 font-semibold text-2xl uppercase tracking-widest mb-8">
                <Megaphone className="w-6 h-6" />
                Senha Chamada
              </div>

              <div
                className={cn(
                  'font-mono font-bold leading-none tracking-tighter transition-colors duration-300',
                  'text-[20vw]',
                  currentCall.type === 'PREFERENCIAL' ? 'text-warning' : 'text-primary',
                  isFlashing ? 'animate-flash' : '',
                )}
              >
                {currentCall.number}
              </div>

              <div className="mt-8">
                <h2 className="text-6xl font-bold text-slate-800 uppercase tracking-wider bg-slate-100 py-6 px-16 rounded-3xl inline-block shadow-sm border border-slate-200">
                  {currentCall.desk || 'Dirija-se à Recepção'}
                </h2>
              </div>
            </div>
          ) : (
            <div className="text-center opacity-40">
              <HeartPulse className="w-48 h-48 mx-auto text-slate-300 mb-8" />
              <h2 className="text-5xl font-bold text-slate-400">Aguardando Chamada...</h2>
            </div>
          )}
        </div>

        {/* Sidebar History */}
        <div className="w-[450px] bg-slate-900 text-white flex flex-col shadow-2xl z-10 border-l-4 border-primary">
          <div className="p-8 bg-slate-800/50 border-b border-slate-700">
            <h3 className="text-2xl font-bold text-slate-200 uppercase tracking-widest">
              Últimas Chamadas
            </h3>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {displayHistory.length > 0 ? (
              displayHistory.map((ticket, index) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-8 border-b border-slate-800 animate-slide-in-top"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div>
                    <div
                      className={cn(
                        'text-5xl font-mono font-bold leading-none mb-2',
                        ticket.type === 'PREFERENCIAL' ? 'text-warning' : 'text-slate-100',
                      )}
                    >
                      {ticket.number}
                    </div>
                    <div className="text-xl text-slate-400 font-medium">{ticket.desk}</div>
                  </div>
                  <div className="text-slate-600 text-lg font-mono">
                    {ticket.calledAt?.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-slate-600 text-xl text-center">
                O histórico aparecerá aqui.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Ticker */}
      <div className="h-16 bg-primary/10 border-t border-primary/20 flex items-center overflow-hidden whitespace-nowrap px-4">
        <div className="inline-block animate-[marquee_20s_linear_infinite] text-2xl font-medium text-primary">
          🏥 Bem-vindo à Ágil Med. Mantenha seus dados cadastrais atualizados na recepção. •
          Lembre-se de trazer documento original com foto. • Atendimento preferencial garantido por
          lei para idosos, gestantes e PCD.
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes marquee {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
      `,
        }}
      />
    </div>
  )
}

export default CallPanel
