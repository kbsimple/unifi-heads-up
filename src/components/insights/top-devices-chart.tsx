'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  type BarRectangleItem,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export interface TopDevice {
  mac: string
  totalBytes: number
  activeSeconds: number
  displayName?: string
}

interface TopDevicesChartProps {
  data: TopDevice[] | undefined
  isLoading: boolean
  selectedMac: string | null
  onSelectDevice: (mac: string) => void
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatBytes(bytes: number): string {
  if (bytes < 1e9) {
    return `${(bytes / 1e6).toFixed(0)}MB`
  }
  return `${(bytes / 1e9).toFixed(1)}GB`
}

export function TopDevicesChart({
  data,
  isLoading,
  selectedMac,
  onSelectDevice,
}: TopDevicesChartProps) {
  if (isLoading || !data) {
    return <Skeleton className="h-64 w-full rounded-lg bg-zinc-800" />
  }

  if (data.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800 rounded-lg">
        <CardContent className="p-4 flex items-center justify-center h-64">
          <p className="text-zinc-500 text-sm">No traffic data available for this period.</p>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map(d => ({ ...d, label: d.displayName ?? d.mac }))
  const height = Math.max(200, data.length * 40)

  return (
    <Card className="bg-zinc-900 border-zinc-800 rounded-lg">
      <CardContent className="p-4">
        <div aria-label="Top devices by bandwidth" role="img">
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
            >
              <XAxis
                type="number"
                dataKey="totalBytes"
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatBytes}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={72}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                  color: '#f4f4f5',
                  fontSize: 12,
                }}
                formatter={(value, _name, props) => {
                  const bytes = typeof value === 'number' ? formatBytes(value) : String(value)
                  const secs = (props.payload as TopDevice)?.activeSeconds
                  const duration = typeof secs === 'number' ? formatDuration(secs) : null
                  return [duration ? `${bytes} · ${duration} active` : bytes, 'Total']
                }}
                labelFormatter={(label) => `Device: ${label}`}
                labelStyle={{ color: '#a1a1aa' }}
                itemStyle={{ color: '#f4f4f5' }}
                cursor={false}
              />
              <Bar
                dataKey="totalBytes"
                cursor="pointer"
                // Disable the default white stroke outline Recharts adds around the
                // active (clicked) bar — selection is shown via Cell fill color instead.
                activeBar={false}
                onClick={(data: BarRectangleItem) => {
                  const mac = (data.payload as TopDevice)?.mac
                  if (mac) onSelectDevice(mac)
                }}
                radius={[0, 4, 4, 0]}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.mac}
                    fill={entry.mac === selectedMac ? '#38bdf8' : '#0ea5e9'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
