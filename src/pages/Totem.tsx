import { useState, useEffect } from 'react'
import useQueueStore, { Ticket } from '@/stores/use-queue-store'
import { HeartPulse, Accessibility, PersonStanding } from 'lucide-react'

const Totem = () => {
  const { generateTicket } = useQueueStore()
  const [printingTicket, setPrintingTicket] = useState<Ticket | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const handlePrint = (type: 'NORMAL' | 'PREFERENCIAL') => {
    if (printingTicket) return

    const ticket = generateTicket(type)
    setPrintingTicket(ticket)

    // Give react time to render the print view, then trigger print
    setTimeout(() => {
      window.print()

      // Auto close after returning from print dialog or timeout
      setTimeout(() => {
        setPrintingTicket(null)
      }, 3000)
    }, 150)
  }

  return (
    <div className="w-full h-screen bg-slate-100 flex flex-col print:bg-white print:h-auto overflow-hidden select-none touch-none">
      {/* Screen Interface - Hidden when printing */}
      <div className="flex-1 flex flex-col print:hidden relative">
        {/* Modal Overlay */}
        {printingTicket && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fade-in">
            <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-md w-full animate-slide-in-top">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-ring">
                <HeartPulse className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Emitindo Senha...</h2>
              <p className="text-gray-500 text-lg mb-8">Por favor, retire seu bilhete abaixo.</p>

              <div className="border-4 border-dashed border-gray-200 rounded-xl p-6 bg-gray-50">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {printingTicket.type === 'NORMAL' ? 'ATENDIMENTO NORMAL' : 'PREFERENCIAL'}
                </p>
                <p className="text-5xl font-mono font-bold text-gray-900">
                  {printingTicket.number}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="bg-white py-8 px-12 shadow-sm flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-primary p-3 rounded-xl">
              <HeartPulse className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary leading-tight">Ágil Med</h1>
              <p className="text-muted-foreground font-medium">Recepção de Pacientes</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-gray-800 tracking-tight">
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-gray-500 font-medium">
              {currentTime.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
        </header>

        {/* Action Area */}
        <main className="flex-1 flex flex-col md:flex-row items-stretch justify-center gap-8 p-12 max-w-7xl mx-auto w-full">
          <button
            onClick={() => handlePrint('NORMAL')}
            className="flex-1 relative overflow-hidden group rounded-3xl bg-white shadow-soft border-2 border-transparent hover:border-primary/20 transition-all active:scale-[0.98] active:shadow-inner flex flex-col items-center justify-center p-12"
          >
            <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-in-out" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center mb-8 group-hover:bg-primary group-hover:text-white transition-colors duration-300 text-primary">
                <PersonStanding className="w-16 h-16" />
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 text-center">
                ATENDIMENTO
                <br />
                NORMAL
              </h2>
              <p className="text-xl text-gray-500 text-center">
                Pacientes com horário agendado ou rotina
              </p>
            </div>
          </button>

          <button
            onClick={() => handlePrint('PREFERENCIAL')}
            className="flex-1 relative overflow-hidden group rounded-3xl bg-warning shadow-soft border-2 border-transparent hover:border-warning/80 transition-all active:scale-[0.98] active:shadow-inner flex flex-col items-center justify-center p-12"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-in-out" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mb-8 text-gray-900 group-hover:bg-white transition-colors duration-300">
                <Accessibility className="w-16 h-16" />
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 text-center">
                ATENDIMENTO
                <br />
                PREFERENCIAL
              </h2>
              <div className="flex gap-2 text-gray-800 font-medium text-lg mt-4 bg-white/30 px-6 py-3 rounded-full">
                Idosos • Gestantes • PCD
              </div>
            </div>
          </button>
        </main>
      </div>

      {/* Print Interface - ONLY visible on print */}
      <div className="hidden print:block w-[80mm] text-black font-sans bg-white m-0 p-4 text-center">
        <div className="border-b-2 border-black pb-4 mb-4">
          <h1 className="text-2xl font-bold uppercase mb-1">Ágil Med</h1>
          <p className="text-sm">Segurança e Saúde Ocupacional</p>
        </div>

        {printingTicket && (
          <div className="mb-6">
            <p className="text-sm uppercase font-bold tracking-widest mb-1">
              {printingTicket.type === 'NORMAL' ? 'Normal' : 'Preferencial'}
            </p>
            <h2 className="text-6xl font-mono font-bold leading-none my-4">
              {printingTicket.number}
            </h2>
            <p className="text-xs text-gray-600">
              Chegada: {printingTicket.createdAt.toLocaleTimeString('pt-BR')} -{' '}
              {printingTicket.createdAt.toLocaleDateString('pt-BR')}
            </p>
          </div>
        )}

        <div className="border-t-2 border-black pt-4 mt-4">
          <p className="text-sm font-bold uppercase mb-2">
            Aguarde ser chamado
            <br />
            no painel
          </p>
          <p className="text-[10px] mt-4">Obrigado por escolher a Ágil Med!</p>
        </div>
      </div>
    </div>
  )
}

export default Totem
