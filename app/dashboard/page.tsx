"use client"

import { generateEvent } from "@/lib/ecora-core"
import { generateReasoning } from "@/lib/ecora-core"
import { addEventToMemory, getMemory } from "@/lib/ecora-memory"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Flame,
  Gauge,
  MapPin,
  Radar,
  Recycle,
  Route,
  ShieldAlert,
  Siren,
  TrafficCone,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react"

/* ============================================================
   SHARED SIMULATION ENGINE (frontend-only, no backend)
   Same model as the citizen portal — one live system.
   ============================================================ */

type Severity = "low" | "medium" | "high"
type EventType =
  | "Waste Detected"
  | "Pothole Detected"
  | "Citizen Report Submitted"
  | "Hotspot Verified"
type City = "Jaipur" | "Jodhpur" | "Udaipur" | "Ajmer" | "Kota"

type SystemEvent = {
  id: string
  type: EventType
  severity: Severity
  timestamp: number
  city: string
  confidence: number
  x?: number
  y?: number
}

const CITIES: City[] = ["Jaipur", "Jodhpur", "Udaipur", "Ajmer", "Kota"]
const EVENT_TYPES: EventType[] = [
  "Waste Detected",
  "Pothole Detected",
  "Citizen Report Submitted",
  "Hotspot Verified",
]
const SEVERITIES: Severity[] = ["low", "medium", "high"]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function makeEvent(): SystemEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: pick(EVENT_TYPES),
    severity: pick(SEVERITIES),
    timestamp: Date.now(),
    city: pick(CITIES),
    confidence: 80 + Math.floor(Math.random() * 20),
    x: 12 + Math.random() * 76,
    y: 14 + Math.random() * 70,
  }
}

function useSimulationEngine(maxEvents = 60) {
  const [events, setEvents] = useState<SystemEvent[]>(() => {
  if (typeof window === "undefined") return []

  const saved = localStorage.getItem("ecora_events")
  if (!saved) return []

  try {
    return JSON.parse(saved) as SystemEvent[]
  } catch {
    return []
  }
})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Load previous memory on startup
    const memory = getMemory()

if (memory.length > 0) {
  setEvents(memory.slice(0, maxEvents))
} else {
      setEvents(Array.from({ length: 8 }, generateEvent))
    }

    function tick() {
      const newEvent = generateEvent()

      // save to memory
      addEventToMemory(newEvent)

      // update UI
      setEvents((prev) => [newEvent, ...prev].slice(0, maxEvents))

      timer.current = setTimeout(tick, 3000 + Math.random() * 2000)
    }

    timer.current = setTimeout(tick, 2000)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [maxEvents])

  return events
}

/* ============================================================ */

const EVENT_META: Record<
  EventType,
  { icon: React.ComponentType<{ className?: string }>; dot: string; tone: string }
> = {
  "Waste Detected": { icon: Recycle, dot: "bg-rose-400", tone: "text-rose-300" },
  "Pothole Detected": { icon: TrafficCone, dot: "bg-amber-400", tone: "text-amber-300" },
  "Citizen Report Submitted": { icon: MapPin, dot: "bg-sky-400", tone: "text-sky-300" },
  "Hotspot Verified": { icon: CheckCircle2, dot: "bg-fuchsia-400", tone: "text-fuchsia-300" },
}

const SEVERITY_TONE: Record<Severity, string> = {
  low: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  medium: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  high: "border-rose-400/30 bg-rose-400/10 text-rose-300",
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  return `${Math.floor(s / 60)}m ago`
}

export default function DashboardPage() {
  const [now, setNow] = useState<number>(Date.now())
useEffect(() => {
  const interval = setInterval(() => {
    setNow(Date.now())
  }, 1000)

  return () => clearInterval(interval)
}, [])

  const router = useRouter()

useEffect(() => {
  const role = localStorage.getItem("ecora_role")

  if (!role) {
    router.push("/auth")
  }

  if (role === "citizen" && window.location.pathname === "/dashboard") {
    router.push("/citizen")
  }

  if (role === "admin" && window.location.pathname === "/citizen") {
    router.push("/dashboard")
  }
}, [])
  const events = useSimulationEngine()
  

  // keep "time ago" labels fresh
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const stats = useMemo(() => {
    const high = events.filter((e) => e.severity === "high").length
    const waste = events.filter((e) => e.type === "Waste Detected").length
    const verified = events.filter((e) => e.type === "Hotspot Verified").length
    return {
      activeAlerts: high,
      activeEvents: events.length,
      coverage: 78 + (events.length % 12),
      waste,
      verified,
    }
  }, [events])

  return (
    <main className="min-h-screen bg-[#070b0a] text-neutral-200">
      <CommandHeader stats={stats} />
       
      <div className="mx-auto max-w-[1500px] px-4 py-5">
        <div className="grid gap-4 xl:grid-cols-[330px_1fr_330px]">
          {/* ---------------- LEFT: live event stream ---------------- */}
          <aside className="flex flex-col">
            <Panel className="flex max-h-[640px] flex-col">
              <div className="flex items-center justify-between">
                <PanelTitle icon={Activity}>Live Event Stream</PanelTitle>
                <LiveBadge />
              </div>
              <div className="mt-3 -mr-2 flex-1 space-y-2 overflow-y-auto pr-2">
                {events.map((e) => {
                  const reasoning = generateReasoning(e)
                  const meta = EVENT_META[e.type]
                  return(
                    <div
                      key={e.id}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-white/20"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`flex items-center gap-2 text-sm font-medium ${meta.tone}`}>
                          <meta.icon className="size-4" />
                          {e.type}
                        </span>
                        <p className="text-[10px] text-neutral-400 mt-1">
                          AI: {generateReasoning(e).insight}
                        </p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${SEVERITY_TONE[e.severity]}`}
                        >
                          {e.severity}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="size-3" />
                          {e.city}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Gauge className="size-3" />
                          {e.confidence}%
                        </span>
                        <span className="flex items-center gap-1.5 text-neutral-500">
                          <Clock className="size-3" />
                          {timeAgo(e.timestamp)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Panel>
          </aside>

          {/* ---------------- CENTER: map ---------------- */}
          <section className="flex flex-col gap-4">
            <Panel>
              <div className="flex items-center justify-between">
                <PanelTitle icon={MapPin}>Live City Intelligence Map — Jaipur, Rajasthan</PanelTitle>
                <span className="text-xs text-neutral-500">
                  {stats.activeEvents} active signals
                </span>
              </div>
              <MockMap events={events} />
              <MapLegend />
            </Panel>

            {/* AI insights */}
            <Panel>
              <PanelTitle icon={BrainCircuit}>AI Insights Engine</PanelTitle>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Insight icon={Flame} tone="text-rose-300" title="Predicted Hotspots">
                  3 high-risk waste zones forecast in {pickStableCity(events, 0)} within 24h.
                </Insight>
                <Insight icon={ShieldAlert} tone="text-amber-300" title="High-Risk Zones">
                  {pickStableCity(events, 1)} sector 4 flagged — recurring pothole density.
                </Insight>
                <Insight icon={Route} tone="text-emerald-300" title="Suggested Cleanup Route">
                  Optimized route covers 7 hotspots, cutting response time by 34%.
                </Insight>
                <Insight icon={Gauge} tone="text-sky-300" title="System Confidence">
                  Aggregate model confidence holding at {88 + (events.length % 8)}%.
                </Insight>
              </div>
            </Panel>
          </section>

          {/* ---------------- RIGHT: response intelligence ---------------- */}
          <aside className="flex flex-col gap-4">
            <Panel>
              <PanelTitle icon={Siren}>Response Intelligence</PanelTitle>
              <div className="mt-4 grid gap-3">
                <ResponseRow
                  icon={Flame}
                  tone="text-rose-300"
                  label="Critical Zones"
                  value={events.filter((e) => e.severity === "high").length}
                />
                <ResponseRow
                  icon={AlertTriangle}
                  tone="text-amber-300"
                  label="Active Alerts"
                  value={stats.activeAlerts}
                />
                <ResponseRow
                  icon={Activity}
                  tone="text-sky-300"
                  label="Escalated Incidents"
                  value={Math.max(1, Math.floor(stats.activeAlerts / 2))}
                />
              </div>
            </Panel>

            <Panel className="flex-1">
              <PanelTitle icon={CheckCircle2}>Suggested Cleanup Actions</PanelTitle>
              <ul className="mt-3 grid gap-2">
                {events
                  .filter((e) => e.type !== "Citizen Report Submitted")
                  .slice(0, 5)
                  .map((e) => (
                    <li
                      key={e.id}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs leading-relaxed text-neutral-300"
                    >
                      <span className="font-medium text-white">Dispatch crew</span> to{" "}
                      <span className="text-emerald-300">{e.city}</span> for{" "}
                      <span className={EVENT_META[e.type].tone}>
                        {e.type.replace(" Detected", "").toLowerCase()}
                      </span>{" "}
                      cleanup · {e.severity} priority.
                    </li>
                  ))}
              </ul>
            </Panel>
          </aside>
        </div>

        {/* ---------------- BOTTOM: analytics ---------------- */}
        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          <AnalyticsCard
            icon={Recycle}
            tone="text-rose-300"
            label="Waste Detection Trend"
            value={stats.waste * 7 + 124}
            delta="+8.4%"
            data={trendFromEvents(events, "Waste Detected")}
          />
          <AnalyticsCard
            icon={TrafficCone}
            tone="text-amber-300"
            label="Pothole Frequency"
            value={events.filter((e) => e.type === "Pothole Detected").length * 5 + 86}
            delta="+3.1%"
            data={trendFromEvents(events, "Pothole Detected")}
          />
          <AnalyticsCard
            icon={Users}
            tone="text-sky-300"
            label="Citizen Participation"
            value={events.filter((e) => e.type === "Citizen Report Submitted").length * 9 + 210}
            delta="+12.7%"
            data={trendFromEvents(events, "Citizen Report Submitted")}
          />
          <AnalyticsCard
            icon={TrendingUp}
            tone="text-emerald-300"
            label="Resolution Rate"
            value={stats.verified + 64}
            suffix="%"
            delta="+2.2%"
            data={trendFromEvents(events, "Hotspot Verified")}
          />
        </div>
      </div>
    </main>
  )
}

function pickStableCity(events: SystemEvent[], offset: number): City {
  return (events[offset]?.city as City) ?? CITIES[offset % CITIES.length]
}

function trendFromEvents(events: SystemEvent[], type: EventType): number[] {
  // build a small sparkline-ish series, deterministic from current events
  const base = events.filter((e) => e.type === type).length
  return Array.from({ length: 12 }, (_, i) => {
    const v = Math.abs(Math.sin(i * 0.9 + base) * 0.6 + 0.4)
    return Math.round(v * 100)
  })
}

/* ===================== header ===================== */

function CommandHeader({
  stats,
}: {
  stats: { activeAlerts: number; activeEvents: number; coverage: number }
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#070b0a]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/auth"
            className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-neutral-400 transition hover:text-white"
            aria-label="Back to sign in"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <span className="relative flex size-9 items-center justify-center overflow-hidden rounded-lg border border-emerald-400/20 bg-white/[0.06]">
            <img src="/ecora-logo.png" alt="ECORA logo" className="size-8 object-contain" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-wide text-white">
              Municipal Command Center
            </p>
            <p className="text-[11px] tracking-wider text-emerald-400/70">
              Urban Intelligence Operations
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <HeaderStat icon={Truck} label="Coverage" value={`${stats.coverage}%`} tone="text-emerald-300" />
          <HeaderStat icon={AlertTriangle} label="Alerts" value={stats.activeAlerts} tone="text-amber-300" />
          <HeaderStat icon={Radar} label="Events" value={stats.activeEvents} tone="text-sky-300" />
          <LiveBadge />
          <Link
            href="/citizen"
            className="hidden rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:text-white md:block"
          >
            Citizen Portal
          </Link>
        </div>
      </div>
    </header>
  )
}

function HeaderStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  tone: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5">
      <Icon className={`size-4 ${tone}`} />
      <span className="text-sm font-semibold tabular-nums text-white">{value}</span>
      <span className="text-[11px] text-neutral-400">{label}</span>
    </div>
  )
}

/* ===================== UI primitives ===================== */

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl ${className}`}>
      {children}
    </div>
  )
}

function PanelTitle({
  children,
  icon: Icon,
}: {
  children: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-300">
      <Icon className="size-4 text-emerald-300" />
      {children}
    </h3>
  )
}

function LiveBadge() {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/70" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
      </span>
      LIVE
    </span>
  )
}

function ResponseRow({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  tone: string
  label: string
  value: number
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <span className="flex items-center gap-2 text-sm text-neutral-300">
        <Icon className={`size-4 ${tone}`} />
        {label}
      </span>
      <span className={`text-xl font-semibold tabular-nums ${tone}`}>{value}</span>
    </div>
  )
}

function Insight({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  tone: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className={`flex items-center gap-2 text-sm font-medium ${tone}`}>
        <Icon className="size-4" />
        {title}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-neutral-400">{children}</p>
    </div>
  )
}

function AnalyticsCard({
  icon: Icon,
  tone,
  label,
  value,
  delta,
  suffix = "",
  data,
}: {
  icon: React.ComponentType<{ className?: string }>
  tone: string
  label: string
  value: number
  delta: string
  suffix?: string
  data: number[]
}) {
  return (
    <Panel>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-medium text-neutral-400">
          <Icon className={`size-4 ${tone}`} />
          {label}
        </span>
        <span className="text-[11px] text-emerald-300">{delta}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums text-white">
        {value.toLocaleString()}
        {suffix}
      </div>
      <Sparkline data={data} tone={tone} />
    </Panel>
  )
}

function Sparkline({ data, tone }: { data: number[]; tone: string }) {
  const max = Math.max(...data, 1)
  return (
    <div className="mt-3 flex h-12 items-end gap-1">
      {data.map((v, i) => (
        <span
          key={i}
          className={`flex-1 rounded-sm bg-current opacity-70 ${tone}`}
          style={{ height: `${(v / max) * 100}%` }}
        />
      ))}
    </div>
  )
}

/* ===================== mock map ===================== */

function MockMap({ events }: { events: SystemEvent[] }) {
  const markers = events.slice(0, 20)
  return (
    <div className="relative mt-4 aspect-[16/8] w-full overflow-hidden rounded-xl border border-white/10 bg-[#0a1512]">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(52,211,153,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(52,211,153,.08) 1px,transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <svg aria-hidden className="absolute inset-0 size-full" preserveAspectRatio="none">
        <path d="M0,120 Q300,60 600,140 T1200,110" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="16" />
        <path d="M200,0 Q260,260 160,520" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="14" />
        <path d="M820,0 Q760,300 920,560" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="14" />
        <path
          d="M40,420 Q300,360 520,400 T1100,340"
          fill="none"
          stroke="rgba(52,211,153,.45)"
          strokeWidth="2"
          strokeDasharray="8 8"
        />
      </svg>

      {markers.map((e) => {
        const meta = EVENT_META[e.type]
        return (
          <div
            key={e.id}
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${e.x}%`, top: `${e.y}%` }}
          >
            <span className="relative flex">
              {e.severity === "high" && (
                <span className={`absolute inline-flex size-3 animate-ping rounded-full ${meta.dot} opacity-60`} />
              )}
              <span className={`relative block size-2.5 rounded-full ${meta.dot} ring-2 ring-[#0a1512]`} />
            </span>
            <span
              className={`pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap rounded border border-white/10 bg-black/80 px-1.5 py-0.5 text-[9px] opacity-0 transition group-hover:opacity-100 ${meta.tone}`}
            >
              {e.type} · {e.city} · {e.confidence}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

function MapLegend() {
  const items = [
    { label: "Waste hotspot", dot: "bg-rose-400" },
    { label: "Pothole", dot: "bg-amber-400" },
    { label: "Citizen report", dot: "bg-sky-400" },
    { label: "Verified hotspot", dot: "bg-fuchsia-400" },
    { label: "Municipal route", dot: "bg-emerald-400" },
  ]
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-[11px] text-neutral-400">
          <span className={`size-2 rounded-full ${i.dot}`} />
          {i.label}
        </span>
      ))}
    </div>
  )
}
