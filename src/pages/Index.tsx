import { Link } from 'react-router-dom'
import { Monitor, Tv, Headset, BarChart, HeartPulse } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const Index = () => {
  const roles = [
    {
      title: 'Totem de Autoatendimento',
      description: 'Emissão de senhas para pacientes.',
      icon: Monitor,
      href: '/totem',
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Painel de TV',
      description: 'Exibição de senhas chamadas na recepção.',
      icon: Tv,
      href: '/painel',
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      title: 'Painel do Atendente',
      description: 'Controle de filas e chamadas de guichê.',
      icon: Headset,
      href: '/atendente',
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      title: 'Relatórios Gerenciais',
      description: 'Métricas, volumes e tempos de espera.',
      icon: BarChart,
      href: '/relatorios',
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
  ]

  return (
    <div className="container max-w-5xl mx-auto py-12 px-4 flex flex-col min-h-screen justify-center">
      <div className="text-center mb-12 animate-slide-in-top">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="bg-primary p-3 rounded-2xl shadow-soft">
            <HeartPulse className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-primary">Ágil Med</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Sistema Integrado de Gestão de Filas e Atendimento Médico
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map((role, idx) => {
          const Icon = role.icon
          return (
            <Link key={idx} to={role.href} className="group outline-none">
              <Card className="h-full transition-all duration-300 hover:shadow-lg hover:border-primary/40 border-2 group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2">
                <CardHeader>
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 ${role.bg}`}
                  >
                    <Icon className={`h-7 w-7 ${role.color}`} />
                  </div>
                  <CardTitle className="text-2xl">{role.title}</CardTitle>
                  <CardDescription className="text-base mt-2">{role.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="mt-auto pt-12 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Ágil Med Segurança e Saúde Ocupacional.
      </div>
    </div>
  )
}

export default Index
