'use client'

import React, { createContext, useContext, useRef, useCallback } from 'react'
import useSWR from 'swr'
import type { ClientsResponse } from '@/lib/unifi/types'

// One aggregated data point per hour
interface HourlySample {
  hourStart: number      // Unix timestamp at the start of the hour
  avgDownload: number    // Average bytes/sec over the hour
  avgUpload: number
  sampleCount: number    // How many 60s samples went into this average
}

// Raw 60-second sample captured from SWR data
interface MinuteSample {
  timestamp: number
  totalDownload: number
  totalUpload: number
  clientData: Map<string, { download: number; upload: number }>
}

interface TrafficHistoryContextValue {
  siteHistory: HourlySample[]
  getClientHistory: (clientId: string) => HourlySample[]
  isHistoryAvailable: boolean
}

const TrafficHistoryContext = createContext<TrafficHistoryContextValue | null>(null)

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function aggregateToHourly(samples: MinuteSample[]): HourlySample {
  const avgDownload = samples.reduce((s, m) => s + m.totalDownload, 0) / samples.length
  const avgUpload = samples.reduce((s, m) => s + m.totalUpload, 0) / samples.length
  return {
    hourStart: Math.floor(samples[0].timestamp / 3600000) * 3600000,
    avgDownload,
    avgUpload,
    sampleCount: samples.length,
  }
}

function aggregateClientToHourly(
  samples: MinuteSample[],
  clientId: string
): HourlySample {
  const clientSamples = samples.map((m) => ({
    download: m.clientData.get(clientId)?.download ?? 0,
    upload: m.clientData.get(clientId)?.upload ?? 0,
  }))
  const avgDownload = clientSamples.reduce((s, c) => s + c.download, 0) / samples.length
  const avgUpload = clientSamples.reduce((s, c) => s + c.upload, 0) / samples.length
  return {
    hourStart: Math.floor(samples[0].timestamp / 3600000) * 3600000,
    avgDownload,
    avgUpload,
    sampleCount: samples.length,
  }
}

export function TrafficHistoryProvider({ children }: { children: React.ReactNode }) {
  // Store raw 60s samples (keyed by current hour bucket)
  const minuteSamplesRef = useRef<MinuteSample[]>([])
  // Aggregated hourly buckets (max 24)
  const hourlyBucketsRef = useRef<HourlySample[]>([])
  // Per-client hourly buckets: clientId -> HourlySample[]
  const clientHourlyBucketsRef = useRef<Map<string, HourlySample[]>>(new Map())
  // Track last seen timestamp to avoid duplicate samples
  const lastTimestampRef = useRef<number>(0)
  // Track how many hourly samples have been recorded (for isHistoryAvailable)
  const [sampleCount, setSampleCount] = React.useState(0)

  // Subscribe to SWR data but don't render based on it — just accumulate
  useSWR<ClientsResponse>(
    '/api/clients',
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      onSuccess: (data) => {
        // Avoid duplicate processing of same poll result
        if (data.timestamp === lastTimestampRef.current) return
        lastTimestampRef.current = data.timestamp

        const now = data.timestamp
        const currentHourStart = Math.floor(now / 3600000) * 3600000

        // Build per-client map
        const clientData = new Map<string, { download: number; upload: number }>()
        let totalDownload = 0
        let totalUpload = 0

        for (const client of data.clients) {
          clientData.set(client.id, {
            download: client.downloadRate,
            upload: client.uploadRate,
          })
          totalDownload += client.downloadRate
          totalUpload += client.uploadRate
        }

        const newSample: MinuteSample = {
          timestamp: now,
          totalDownload,
          totalUpload,
          clientData,
        }

        minuteSamplesRef.current.push(newSample)

        // Filter samples that belong to the current hour
        const currentHourSamples = minuteSamplesRef.current.filter(
          (s) => Math.floor(s.timestamp / 3600000) * 3600000 === currentHourStart
        )

        // If current hour samples accumulated ≥ 60, aggregate into hourly bucket
        // Also aggregate if we've crossed into a new hour (samples from previous hours)
        const prevHourSamples = minuteSamplesRef.current.filter(
          (s) => Math.floor(s.timestamp / 3600000) * 3600000 < currentHourStart
        )

        if (prevHourSamples.length > 0) {
          // Group previous hour samples by hour
          const byHour = new Map<number, MinuteSample[]>()
          for (const s of prevHourSamples) {
            const h = Math.floor(s.timestamp / 3600000) * 3600000
            if (!byHour.has(h)) byHour.set(h, [])
            byHour.get(h)!.push(s)
          }

          // Aggregate each completed hour
          for (const [, hourSamples] of byHour) {
            const existing = hourlyBucketsRef.current.find(
              (b) => b.hourStart === Math.floor(hourSamples[0].timestamp / 3600000) * 3600000
            )
            if (!existing) {
              const bucket = aggregateToHourly(hourSamples)
              hourlyBucketsRef.current = [...hourlyBucketsRef.current, bucket].slice(-24)

              // Per-client aggregation
              const allClientIds = new Set<string>()
              for (const s of hourSamples) {
                for (const id of s.clientData.keys()) allClientIds.add(id)
              }
              for (const clientId of allClientIds) {
                const clientBucket = aggregateClientToHourly(hourSamples, clientId)
                const existing = clientHourlyBucketsRef.current.get(clientId) ?? []
                clientHourlyBucketsRef.current.set(
                  clientId,
                  [...existing, clientBucket].slice(-24)
                )
              }
            }
          }

          // Remove processed previous-hour samples, keep only current hour
          minuteSamplesRef.current = currentHourSamples
          setSampleCount((c) => c + 1)
        }

        // If current hour has enough samples, also aggregate
        if (currentHourSamples.length >= 60) {
          const existing = hourlyBucketsRef.current.find(
            (b) => b.hourStart === currentHourStart
          )
          if (!existing) {
            const bucket = aggregateToHourly(currentHourSamples)
            hourlyBucketsRef.current = [...hourlyBucketsRef.current, bucket].slice(-24)

            const allClientIds = new Set<string>()
            for (const s of currentHourSamples) {
              for (const id of s.clientData.keys()) allClientIds.add(id)
            }
            for (const clientId of allClientIds) {
              const clientBucket = aggregateClientToHourly(currentHourSamples, clientId)
              const existing = clientHourlyBucketsRef.current.get(clientId) ?? []
              clientHourlyBucketsRef.current.set(
                clientId,
                [...existing, clientBucket].slice(-24)
              )
            }

            minuteSamplesRef.current = []
            setSampleCount((c) => c + 1)
          }
        }
      },
    }
  )

  const getClientHistory = useCallback((clientId: string): HourlySample[] => {
    return clientHourlyBucketsRef.current.get(clientId) ?? []
  }, [])

  const value: TrafficHistoryContextValue = {
    siteHistory: hourlyBucketsRef.current,
    getClientHistory,
    isHistoryAvailable: hourlyBucketsRef.current.length > 0,
  }

  return (
    <TrafficHistoryContext.Provider value={value}>
      {children}
    </TrafficHistoryContext.Provider>
  )
}

export function useTrafficHistory(): TrafficHistoryContextValue {
  const ctx = useContext(TrafficHistoryContext)
  if (!ctx) {
    throw new Error('useTrafficHistory must be used within a TrafficHistoryProvider')
  }
  return ctx
}
