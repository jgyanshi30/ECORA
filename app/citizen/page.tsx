"use client"

import { generateEvent } from "@/lib/ecora-core"
import { ecoraMemory } from "@/lib/ecora-memory"
import { generateReasoning } from "@/lib/ecora-core"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Activity,
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  ImagePlus,
  MapPin,
  Recycle,
  Send,
  Sparkles,
  TrafficCone,
  TrendingUp,
  Upload,
} from "lucide-react"

/* ============================================================
   SHARED SIMULATION ENGINE (frontend-only, no backend)
   Generates a live system event every 4-6 seconds.
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

function useSimulationEngine(maxEvents = 40) {
  // Start empty so server and client render identically (no Math.random on SSR).
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
    // Seed on mount (client-only)
    setEvents(Array.from({ length: 6 }, makeEvent))

    function tick() {
  setEvents((prev) => [makeEvent(), ...prev].slice(0, maxEvents))

  const interval = setInterval(() => {
  const event = generateEvent()

  setEvents((prev) => [event, ...prev].slice(0, 20))
}, 4000)

return () => clearInterval(interval)

  const delay = 4000 + Math.random() * 2000
  timer.current = setTimeout(tick, delay)
}
    const delay = 4000 + Math.random() * 2000
    timer.current = setTimeout(tick, delay)
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
  "Waste Detected": {
    icon: Recycle,
    dot: "bg-rose-400",
    tone: "text-rose-300",
  },
  "Pothole Detected": {
    icon: TrafficCone,
    dot: "bg-amber-400",
    tone: "text-amber-300",
  },
  "Citizen Report Submitted": {
    icon: MapPin,
    dot: "bg-sky-400",
    tone: "text-sky-300",
  },
  "Hotspot Verified": {
    icon: CheckCircle2,
    dot: "bg-fuchsia-400",
    tone: "text-fuchsia-300",
  },
}

const SEVERITY_TONE: Record<Severity, string> = {
  low: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  medium: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  high: "border-rose-400/30 bg-rose-400/10 text-rose-300",
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  return `${m}m ago`
}

export default function CitizenPage() {
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
  const [reportsSubmitted, setReportsSubmitted] = useState(14)
  const [flash, setFlash] = useState<string | null>(null)

  const resolved = events.filter((e) => e.type === "Hotspot Verified").length + 9
  const score = Math.min(99, 60 + reportsSubmitted + resolved)

  // Build citizen reports table — citizen reports + their own submissions
  const reports = events
    .filter((e) => e.type === "Citizen Report Submitted" || e.type === "Hotspot Verified")
    .slice(0, 8)

  function submitReport(kind: string) {
    setReportsSubmitted((n) => n + 1)
    setFlash(`${kind} report submitted for review`)
    setTimeout(() => setFlash(null), 2600)
  }

  return (
    <main className="min-h-screen bg-[#070b0a] text-neutral-200">
      <TopBar title="Citizen Portal" subtitle="Community Cleanliness Network" />

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-4 lg:grid-cols-[260px_1fr_300px]">
          {/* ---------------- LEFT: user stats ---------------- */}
          <aside className="flex flex-col gap-4">
            <Panel>
              <PanelTitle icon={Award}>Your Impact</PanelTitle>
              <div className="mt-4 grid gap-3">
                <Stat label="Reports Submitted" value={reportsSubmitted} accent="text-sky-300" />
                <Stat label="Issues Resolved" value={resolved} accent="text-emerald-300" />
                <Stat label="Contribution Score" value={score} accent="text-amber-300" suffix=" pts" />
              </div>
            </Panel>

            <Panel>
              <PanelTitle icon={TrendingUp}>Community Score</PanelTitle>
              <div className="mt-4">
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-semibold text-white">87%</span>
                  <span className="text-xs text-emerald-300">+3.2% this week</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[87%] rounded-full bg-gradient-to-r from-emerald-400 to-teal-400" />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-neutral-400">
                  Your neighborhood ranks in the top 12% for cleanliness
                  participation across Rajasthan.
                </p>
              </div>
            </Panel>
          </aside>

          {/* ---------------- CENTER: map ---------------- */}
          <section className="flex flex-col gap-4">
            <Panel className="flex-1">
              <div className="flex items-center justify-between">
                <PanelTitle icon={MapPin}>Nearby Activity — Jaipur</PanelTitle>
                <LiveBadge />
              </div>
              <MockMap events={events} showUser />
              <MapLegend />
            </Panel>

            {/* AI recommendations */}
            <Panel>
              <PanelTitle icon={Sparkles}>AI Recommendations</PanelTitle>
              <ul className="mt-3 grid gap-2 text-sm text-neutral-300">
                <Recommendation>
                  High waste accumulation predicted near MI Road — consider
                  reporting if you pass by today.
                </Recommendation>
                <Recommendation>
                  3 unverified hotspots within 2km of your location need citizen
                  confirmation.
                </Recommendation>
                <Recommendation>
                  Your reports have a 92% verification rate — keep contributing.
                </Recommendation>
              </ul>
            </Panel>
          </section>

          {/* ---------------- RIGHT: quick actions ---------------- */}
          <aside className="flex flex-col gap-4">
            <Panel>
              <PanelTitle icon={Send}>Quick Report</PanelTitle>
              {flash && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
                  <CheckCircle2 className="size-3.5" />
                  {flash}
                </div>
              )}
              <div className="mt-4 grid gap-3">
                <button
                  type="button"
                  onClick={() => submitReport("Waste")}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm font-medium text-white transition hover:border-rose-400/40 hover:bg-rose-400/10"
                >
                  <Recycle className="size-5 text-rose-300" />
                  Report Waste
                </button>
                <button
                  type="button"
                  onClick={() => submitReport("Pothole")}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm font-medium text-white transition hover:border-amber-400/40 hover:bg-amber-400/10"
                >
                  <TrafficCone className="size-5 text-amber-300" />
                  Report Pothole
                </button>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-3 text-sm text-neutral-400 transition hover:border-emerald-400/40">
                  <ImagePlus className="size-5 text-emerald-300" />
                  Upload image / video
                  <input type="file" className="hidden" />
                </label>

                <button
                  type="button"
                  onClick={() => submitReport("Detailed")}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
                >
                  <Upload className="size-4" />
                  Submit Report
                </button>
              </div>
            </Panel>

            <Panel>
              <PanelTitle icon={MapPin}>Nearby Hotspots</PanelTitle>
              <ul className="mt-3 grid gap-2 text-sm">
                {events
                  .filter((e) => e.type !== "Citizen Report Submitted")
                  .slice(0, 4)
                  .map((e) => {
                    const meta = EVENT_META[e.type]
                    return (
                      <li
                        key={e.id}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
                      >
                        <span className="flex items-center gap-2 text-neutral-300">
                          <span className={`size-2 rounded-full ${meta.dot}`} />
                          {e.city}
                        </span>
                        <span className={`text-xs ${meta.tone}`}>{e.type.replace(" Detected", "")}</span>
                      </li>
                    )
                  })}
              </ul>
            </Panel>
          </aside>
        </div>

        {/* ---------------- BOTTOM: recent reports table ---------------- */}
        <Panel className="mt-4">
          <div className="flex items-center justify-between">
            <PanelTitle icon={Clock}>Recent Reports</PanelTitle>
            <LiveBadge />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-neutral-500">
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Location</th>
                  <th className="pb-3 font-medium">Confidence</th>
                  <th className="pb-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((e, i) => {
                  const meta = EVENT_META[e.type]
                  const status =
                    e.type === "Hotspot Verified"
                      ? i % 2 === 0
                        ? "Resolved"
                        : "Verified"
                      : "Submitted"
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-white/5 text-neutral-300 transition hover:bg-white/[0.02]"
                    >
                      <td className="py-3">
                        <span className="flex items-center gap-2">
                          <meta.icon className={`size-4 ${meta.tone}`} />
                          {e.type === "Hotspot Verified" ? "Waste" : "Citizen Report"}
                        </span>
                      </td>
                      <td className="py-3">
                        <StatusPill status={status} />
                      </td>
                      <td className="py-3 text-neutral-400">{e.city}</td>
                      <td className="py-3 text-neutral-400">{e.confidence}%</td>
                      <td className="py-3 text-neutral-500">{timeAgo(e.timestamp)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </main>
  )
}

/* ===================== shared UI primitives ===================== */

function TopBar({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#070b0a]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
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
            <p className="text-sm font-semibold tracking-wide text-white">{title}</p>
            <p className="text-[11px] tracking-wider text-emerald-400/70">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge />
          <Link
            href="/dashboard"
            className="hidden rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:text-white sm:block"
          >
            Command Center
          </Link>
        </div>
      </div>
    </header>
  )
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl ${className}`}
    >
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

function Stat({
  label,
  value,
  accent,
  suffix = "",
}: {
  label: string
  value: number
  accent: string
  suffix?: string
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className={`text-2xl font-semibold tabular-nums ${accent}`}>
        {value}
        {suffix}
      </div>
      <div className="mt-0.5 text-xs text-neutral-400">{label}</div>
    </div>
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

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "Resolved"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
      : status === "Verified"
        ? "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-300"
        : "border-sky-400/30 bg-sky-400/10 text-sky-300"
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tone}`}>
      {status}
    </span>
  )
}

function Recommendation({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs leading-relaxed text-neutral-300">
      <Activity className="mt-0.5 size-3.5 shrink-0 text-emerald-300" />
      {children}
    </li>
  )
}

/* ===================== mock map ===================== */

function MockMap({
  events,
  showUser = false,
}: {
  events: SystemEvent[]
  showUser?: boolean
}) {
  const markers = events.slice(0, 14)
  return (
    <div className="relative mt-4 aspect-[16/10] w-full overflow-hidden rounded-xl border border-white/10 bg-[#0a1512]">
      {/* grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(52,211,153,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(52,211,153,.08) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* faux roads */}
      <svg aria-hidden className="absolute inset-0 size-full" preserveAspectRatio="none">
        <path d="M0,70 Q200,40 400,90 T800,70" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="14" />
        <path d="M120,0 Q160,180 90,360" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="12" />
        <path d="M600,0 Q540,200 680,400" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="12" />
      </svg>

      {/* user location */}
      {showUser && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="relative flex size-4">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/50" />
            <span className="relative inline-flex size-4 rounded-full border-2 border-[#0a1512] bg-emerald-400" />
          </span>
          <span className="absolute left-1/2 mt-1 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-emerald-300">
            You
          </span>
        </div>
      )}

      {/* markers */}
      {markers.map((e) => {
        const meta = EVENT_META[e.type]
        return (
          <div
            key={e.id}
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${e.x}%`, top: `${e.y}%` }}
          >
            <span className={`block size-2.5 rounded-full ${meta.dot} ring-2 ring-[#0a1512]`} />
            <span
              className={`pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap rounded border border-white/10 bg-black/70 px-1.5 py-0.5 text-[9px] opacity-0 transition group-hover:opacity-100 ${meta.tone}`}
            >
              {e.type} · {e.city}
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
