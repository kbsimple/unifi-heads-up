'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'

interface TrafficChartProps {
  data: Array<{ time: string; bandwidth: number | null }>
  title?: string
}

export const WINDOW_OPTIONS = [
  { minutes: 5,    label: '5m' },
  { minutes: 30,   label: '30m' },
  { minutes: 60,   label: '1h' },
  { minutes: 180,  label: '3h' },
  { minutes: 720,  label: '12h' },
  { minutes: 1440, label: '24h' },
] as const

interface WindowSelectorProps {
  value: number
  onChange: (minutes: number) => void
}

export function WindowSelector({ value, onChange }: WindowSelectorProps) {
  return (
    <div className="flex gap-1">
      {WINDOW_OPTIONS.map(({ minutes, label }) => (
        <button
          key={minutes}
          type="button"
          onClick={() => onChange(minutes)}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${
            value === minutes
              ? 'bg-sky-600 text-white'
              : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function formatHourLabel(timestamp: number): string {
  const hour = new Date(timestamp).getHours()
  const ampm = hour >= 12 ? 'pm' : 'am'
  const h = hour % 12 || 12
  return `${h}${ampm}`
}

export function TrafficChart({ data, title }: TrafficChartProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800 rounded-lg">
      <CardContent className="p-4">
        {title && (
          <h3 className="text-sm font-medium text-zinc-400 mb-3">{title}</h3>
        )}
        <div
          aria-label="Traffic chart showing bandwidth over time"
          role="img"
        >
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={data}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={40}
                tickFormatter={(value: number) => `${value.toFixed(1)}`}
                label={{
                  value: 'Mbps',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#71717a',
                  fontSize: 11,
                  dx: -4,
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                  color: '#f4f4f5',
                  fontSize: 12,
                }}
                formatter={(value) => [typeof value === 'number' ? `${value.toFixed(2)} Mbps` : `${value} Mbps`, 'Bandwidth']}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Area
                type="monotone"
                dataKey="bandwidth"
                stroke="#0ea5e9"
                strokeWidth={2}
                fill="url(#trafficGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#0ea5e9' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
