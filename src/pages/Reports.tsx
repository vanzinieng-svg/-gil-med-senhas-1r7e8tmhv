import { useMemo } from 'react'
import useQueueStore from '@/stores/use-queue-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Clock, Users, Activity } from 'lucide-react'

const Reports = () => {
  const { tickets } = useQueueStore()

  const completedTickets = tickets.filter((t) => t.status === 'COMPLETED')

  // Calculate KPIs
  const totalServed = completedTickets.length

  const averageWaitMs =
    completedTickets.reduce((acc, t) => {
      if (t.calledAt && t.createdAt) {
        return acc + (t.calledAt.getTime() - t.createdAt.getTime())
      }
      return acc
    }, 0) / (totalServed || 1)
  const avgWaitMins = Math.round(averageWaitMs / 60000)

  const averageServiceMs =
    completedTickets.reduce((acc, t) => {
      if (t.completedAt && t.calledAt) {
        return acc + (t.completedAt.getTime() - t.calledAt.getTime())
      }
      return acc
    }, 0) / (totalServed || 1)
  const avgServiceMins = Math.round(averageServiceMs / 60000)

  // Data for Pie Chart
  const pieData = useMemo(() => {
    const normal = completedTickets.filter((t) => t.type === 'NORMAL').length
    const pref = completedTickets.filter((t) => t.type === 'PREFERENCIAL').length
    return [
      { name: 'Normal', value: normal, fill: 'var(--color-normal)' },
      { name: 'Preferencial', value: pref, fill: 'var(--color-pref)' },
    ]
  }, [completedTickets])

  const pieConfig = {
    normal: { label: 'Normal', color: 'hsl(var(--primary))' },
    pref: { label: 'Preferencial', color: 'hsl(var(--warning))' },
  }

  // Data for Bar Chart (Hourly traffic based on createdAt of all tickets today)
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 12 }, (_, i) => i + 8) // 8 AM to 7 PM
    const data = hours.map((h) => ({
      hour: `${h}:00`,
      Normal: 0,
      Preferencial: 0,
    }))

    tickets.forEach((t) => {
      const h = t.createdAt.getHours()
      const entry = data.find((d) => parseInt(d.hour) === h)
      if (entry) {
        if (t.type === 'NORMAL') entry.Normal++
        else entry.Preferencial++
      }
    })
    return data
  }, [tickets])

  const barConfig = {
    Normal: { label: 'Normal', color: 'hsl(var(--primary))' },
    Preferencial: { label: 'Preferencial', color: 'hsl(var(--warning))' },
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Relatórios Gerenciais</h1>
        <p className="text-muted-foreground">Visão geral do atendimento diário da clínica.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pacientes Atendidos
            </CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalServed}</div>
            <p className="text-xs text-muted-foreground mt-1">Neste dia</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tempo Médio de Espera
            </CardTitle>
            <Clock className="w-4 h-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgWaitMins} min</div>
            <p className="text-xs text-muted-foreground mt-1">Da emissão à chamada</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tempo Médio de Atendimento
            </CardTitle>
            <Activity className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgServiceMins} min</div>
            <p className="text-xs text-muted-foreground mt-1">Duração no guichê</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Pie Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Volume por Tipo</CardTitle>
            <CardDescription>Distribuição de atendimentos concluídos.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center min-h-[300px]">
            <ChartContainer config={pieConfig} className="w-full h-full pb-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Fluxo de Emissões</CardTitle>
            <CardDescription>Senhas emitidas por hora do dia.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px]">
            <ChartContainer config={barConfig} className="w-full h-[300px]">
              <BarChart
                accessibilityLayer
                data={hourlyData}
                margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="Normal" fill="var(--color-Normal)" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="Preferencial"
                  fill="var(--color-Preferencial)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico Detalhado</CardTitle>
          <CardDescription>Log completo de operações do dia atual.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Senha</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Guichê</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Chamada</TableHead>
                <TableHead>Conclusão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...tickets]
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .slice(0, 15)
                .map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono font-bold">
                      <span
                        className={ticket.type === 'PREFERENCIAL' ? 'text-warning' : 'text-primary'}
                      >
                        {ticket.number}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          ticket.status === 'WAITING'
                            ? 'secondary'
                            : ticket.status === 'CALLED'
                              ? 'default'
                              : 'outline'
                        }
                        className={
                          ticket.status === 'COMPLETED' ? 'border-success text-success' : ''
                        }
                      >
                        {ticket.status === 'WAITING'
                          ? 'Aguardando'
                          : ticket.status === 'CALLED'
                            ? 'Em Atendimento'
                            : 'Concluído'}
                      </Badge>
                    </TableCell>
                    <TableCell>{ticket.desk || '-'}</TableCell>
                    <TableCell>{ticket.createdAt.toLocaleTimeString('pt-BR')}</TableCell>
                    <TableCell>{ticket.calledAt?.toLocaleTimeString('pt-BR') || '-'}</TableCell>
                    <TableCell>{ticket.completedAt?.toLocaleTimeString('pt-BR') || '-'}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          <div className="text-center text-sm text-muted-foreground mt-4">
            Mostrando as 15 senhas mais recentes.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Reports
