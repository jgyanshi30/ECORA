import Link from "next/link"
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Camera,
  ChevronRight,
  Cpu,
  Gauge,
  LayoutDashboard,
  MapPin,
  Navigation,
  Play,
  Radar,
  Recycle,
  ShieldCheck,
  Siren,
  TrafficCone,
  Truck,
  Users,
} from "lucide-react"

/* ---------------------------------- DATA --------------------------------- */

const NAV_LINKS = [
  { label: "Sign In", href: "/auth" },
  { label: "Citizen Portal", href: "/citizen" },
  { label: "Command Center", href: "/dashboard" },
]

const HERO_TAGS = [
  { label: "Municipal Vehicle", icon: Truck },
  { label: "AI Detection Engine", icon: BrainCircuit },
  { label: "Waste Hotspot", icon: Recycle },
  { label: "Pothole Detection", icon: TrafficCone },
  { label: "GPS Event", icon: Navigation },
  { label: "Detection Confidence", icon: Gauge },
  { label: "Geospatial Intelligence", icon: MapPin },
]

const NETWORK_CARDS = [
  {
    icon: Truck,
    title: "Municipal Vehicles",
    body: "Dashcams mounted on municipal vehicles continuously monitor roads and public spaces while performing routine operations.",
  },
  {
    icon: Users,
    title: "Citizen Reports",
    body: "Citizens contribute geo-tagged reports by uploading photos and videos of waste dumping, potholes, and infrastructure issues.",
  },
  {
    icon: BrainCircuit,
    title: "AI Detection Engine",
    body: "Computer vision and machine learning models automatically analyze incoming visual data to identify waste accumulation, illegal dumping, road defects, and environmental hazards.",
  },
  {
    icon: LayoutDashboard,
    title: "Urban Intelligence Layer",
    body: "Detected issues are transformed into geospatial intelligence, hotspot analytics, and decision-support insights for municipal authorities.",
  },
]

const METRICS = [
  { value: "12", label: "Active Vehicles" },
  { value: "48", label: "Hotspots Identified" },
  { value: "126", label: "Citizen Reports Processed" },
  { value: "92%", label: "Detection Confidence" },
]

const CAPABILITIES = [
  {
    icon: Recycle,
    title: "Real-Time Waste Detection",
    body: "Automatically identify roadside waste accumulation and illegal dumping activities from municipal vehicle feeds.",
  },
  {
    icon: TrafficCone,
    title: "Pothole Intelligence",
    body: "Detect road defects and infrastructure issues before they become major maintenance concerns.",
  },
  {
    icon: MapPin,
    title: "Geo-Tagged Reporting",
    body: "Allow citizens to submit precise reports with location-aware images and videos.",
  },
  {
    icon: Radar,
    title: "Hotspot Prediction",
    body: "Use historical detection patterns and machine learning to identify recurring problem zones and predict future accumulation risks.",
  },
  {
    icon: ShieldCheck,
    title: "Municipal Command Center",
    body: "Monitor detections, vehicle coverage, alerts, hotspot trends, and operational intelligence from a centralized control system.",
  },
  {
    icon: Activity,
    title: "Decision Support Intelligence",
    body: "Generate actionable recommendations that help authorities prioritize interventions and optimize municipal resources.",
  },
]

const MAP_LABELS = [
  { label: "Waste Hotspot", tone: "text-emerald-300", dot: "bg-emerald-400" },
  { label: "Pothole Cluster", tone: "text-amber-300", dot: "bg-amber-400" },
  { label: "Citizen Report", tone: "text-sky-300", dot: "bg-sky-400" },
  { label: "Municipal Route", tone: "text-teal-300", dot: "bg-teal-400" },
  { label: "High-Risk Zone", tone: "text-rose-300", dot: "bg-rose-400" },
  { label: "AI Alert", tone: "text-fuchsia-300", dot: "bg-fuchsia-400" },
]

const ECOSYSTEM = [
  { icon: Users, label: "Citizens" },
  { icon: Truck, label: "Municipal Vehicles" },
  { icon: BrainCircuit, label: "AI Detection Engine" },
  { icon: MapPin, label: "Geospatial Intelligence Layer" },
  { icon: LayoutDashboard, label: "Municipal Command Center" },
  { icon: Siren, label: "Response Teams" },
]

/* ------------------------------ SMALL PIECES ----------------------------- */

function EcoraLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative flex size-10 items-center justify-center overflow-hidden rounded-xl border border-emerald-400/20 bg-white/[0.06]">
        <span className="absolute inset-0 rounded-xl bg-emerald-400/10 blur-md" />
        <img
          src="/ecora-logo.png"
          alt="ECORA by Ecorian logo"
          className="relative size-9 object-contain"
        />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-base font-semibold tracking-[0.18em] text-white">
          ECORA
        </span>
        <span className="text-[10px] font-medium tracking-[0.22em] text-emerald-400/70">
          BY ECORIAN
        </span>
      </span>
    </div>
  )
}

function SectionEyebrow({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-300/80">
      <span className="size-1.5 rounded-full bg-emerald-400" />
      {children}
    </span>
  )
}

/* --------------------------------- PAGE ---------------------------------- */

export default function Page() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070b0a] text-neutral-200 selection:bg-emerald-400/30">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/2 top-[-10%] size-[680px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[140px]" />
        <div className="absolute right-[-10%] top-[30%] size-[420px] rounded-full bg-teal-500/10 blur-[130px]" />
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)",
          }}
        />
      </div>

      <div className="relative z-10">
        {/* ============================ NAVBAR ============================ */}
        <header className="sticky top-0 z-50 border-b border-white/5 bg-[#070b0a]/80 backdrop-blur-xl">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <EcoraLogo />
            <div className="hidden items-center gap-8 md:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-neutral-400 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <Link
              href="/auth"
              className="group inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-[#06120d] shadow-[0_0_28px_-6px] shadow-emerald-400/60 transition-all hover:bg-emerald-300"
            >
              Enter ECORA
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </nav>
        </header>

        {/* ============================= HERO ============================= */}
        <section
          id="platform"
          className="mx-auto max-w-6xl px-5 pb-10 pt-16 text-center md:pt-24"
        >
          <div className="flex justify-center">
            <SectionEyebrow>
              Eco Cleanliness Observation &amp; Real-Time Analytics
            </SectionEyebrow>
          </div>
          <h1 className="mx-auto mt-7 max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl">
            Every Road{" "}
            <span className="bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent">
              Becomes A Sensor
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-neutral-400 md:text-lg">
            ECORA transforms municipal vehicle dashcam feeds and citizen reports
            into actionable urban intelligence. Using AI-powered computer
            vision, geospatial analytics, and real-time monitoring, cities can
            automatically detect waste hotspots, identify potholes, monitor
            urban cleanliness, and prioritize municipal response actions.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-6 py-3 text-sm font-semibold text-[#06120d] shadow-[0_0_36px_-8px] shadow-emerald-400/70 transition-all hover:bg-emerald-300 sm:w-auto"
            >
              Enter ECORA
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-neutral-200 transition-colors hover:border-white/20 hover:bg-white/[0.06] sm:w-auto"
            >
              <Play className="size-4 text-emerald-300" />
              View Live Demo
            </Link>
          </div>

          {/* hero visual */}
          <div className="relative mx-auto mt-14 max-w-5xl">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-1 shadow-2xl shadow-black/40">
              <div className="relative h-[300px] overflow-hidden rounded-xl bg-[#080f0d] md:h-[420px]">
                {/* radar grid */}
                <div
                  className="absolute inset-0 opacity-60"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(52,211,153,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.06) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }}
                />
                {/* scan beams */}
                <div className="absolute left-1/2 top-1/2 size-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(52,211,153,0.12)_40deg,transparent_80deg)]" />
                {/* concentric rings */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  {[120, 240, 360].map((s) => (
                    <span
                      key={s}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-400/15"
                      style={{ width: s, height: s }}
                    />
                  ))}
                </div>
                {/* nodes */}
                <span className="absolute left-[28%] top-[34%] size-3 rounded-full bg-emerald-400 shadow-[0_0_18px_4px] shadow-emerald-400/50" />
                <span className="absolute left-[62%] top-[58%] size-3 rounded-full bg-teal-300 shadow-[0_0_18px_4px] shadow-teal-300/40" />
                <span className="absolute left-[74%] top-[30%] size-2.5 rounded-full bg-sky-300 shadow-[0_0_16px_4px] shadow-sky-300/40" />
                <span className="absolute left-[42%] top-[68%] size-2.5 rounded-full bg-amber-300 shadow-[0_0_16px_4px] shadow-amber-300/40" />

                {/* center chip */}
                <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
                  <span className="flex size-16 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 backdrop-blur-sm">
                    <Cpu className="size-7 text-emerald-300" />
                  </span>
                  <span className="rounded-md border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] font-medium text-emerald-200 backdrop-blur">
                    ECORA Core
                  </span>
                </div>
              </div>
            </div>

            {/* floating tags */}
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              {HERO_TAGS.map(({ label, icon: Icon }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-neutral-300 backdrop-blur transition-colors hover:border-emerald-400/30 hover:text-white"
                >
                  <Icon className="size-3.5 text-emerald-300" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== INTELLIGENCE NETWORK ==================== */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="text-center">
            <SectionEyebrow>Intelligence Network</SectionEyebrow>
            <h2 className="mx-auto mt-5 max-w-2xl text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
              From raw observations to actionable city intelligence
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-pretty leading-relaxed text-neutral-400">
              ECORA converts millions of urban observations into a connected
              intelligence network that helps municipalities monitor,
              understand, and respond to city-wide issues faster than
              traditional inspection-based systems.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {NETWORK_CARDS.map(({ icon: Icon, title, body }, i) => (
              <div
                key={title}
                className="group relative rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition-all hover:border-emerald-400/25 hover:bg-white/[0.05]"
              >
                <span className="absolute right-5 top-5 text-xs font-mono text-neutral-600">
                  0{i + 1}
                </span>
                <span className="flex size-11 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300 transition-colors group-hover:bg-emerald-400/20">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 text-base font-semibold text-white">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* =========================== METRICS =========================== */}
        <section className="mx-auto max-w-6xl px-5 pb-20">
          <div className="grid gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/5 sm:grid-cols-2 lg:grid-cols-4">
            {METRICS.map(({ value, label }) => (
              <div
                key={label}
                className="bg-[#080f0d] p-8 text-center transition-colors hover:bg-[#0a1512]"
              >
                <div className="bg-gradient-to-b from-white to-emerald-200 bg-clip-text text-4xl font-semibold text-transparent md:text-5xl">
                  {value}
                </div>
                <div className="mt-2 text-sm text-neutral-400">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ====================== PLATFORM CAPABILITIES ================= */}
        <section id="capabilities" className="mx-auto max-w-6xl px-5 py-20">
          <div className="text-center">
            <SectionEyebrow>Platform Capabilities</SectionEyebrow>
            <h2 className="mx-auto mt-5 max-w-2xl text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Operational Intelligence for every urban surface
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-pretty leading-relaxed text-neutral-400">
              A unified platform combining artificial intelligence, machine
              learning, geospatial intelligence, and citizen participation to
              create smarter, cleaner, and more responsive cities.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="group rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition-all hover:border-emerald-400/25 hover:bg-white/[0.05]"
              >
                <span className="flex size-11 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300 transition-transform group-hover:scale-105">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 flex items-center justify-between text-base font-semibold text-white">
                  {title}
                  <ChevronRight className="size-4 text-neutral-600 transition-all group-hover:translate-x-0.5 group-hover:text-emerald-300" />
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ===================== LIVE CITY INTELLIGENCE ================= */}
        <section id="dashboard" className="mx-auto max-w-6xl px-5 py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <SectionEyebrow>Live City Intelligence</SectionEyebrow>
              <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Every issue is mapped, every signal is visible
              </h2>
              <p className="mt-5 text-pretty leading-relaxed text-neutral-400">
                Detected events are transformed into geospatial intelligence,
                enabling authorities to visualize hotspots, monitor trends, and
                coordinate city-wide response efforts through a unified
                operational view.
              </p>
              <div className="mt-7 flex flex-col gap-3">
                {MAP_LABELS.map(({ label, tone, dot }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-4 py-2.5"
                  >
                    <span className={`size-2.5 rounded-full ${dot}`} />
                    <span className={`text-sm font-medium ${tone}`}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CSS map visualization */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#080f0d] p-1 shadow-2xl shadow-black/40">
              <div className="relative h-[360px] overflow-hidden rounded-xl md:h-[440px]">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(52,211,153,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.07) 1px, transparent 1px)",
                    backgroundSize: "34px 34px",
                  }}
                />
                {/* roads */}
                <span className="absolute left-0 top-[30%] h-px w-full bg-white/10" />
                <span className="absolute left-0 top-[64%] h-px w-full bg-white/10" />
                <span className="absolute left-[24%] top-0 h-full w-px bg-white/10" />
                <span className="absolute left-[70%] top-0 h-full w-px bg-white/10" />
                {/* route */}
                <svg
                  className="absolute inset-0 size-full"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M30 60 L160 60 L160 280 L330 280 L330 130 L470 130"
                    stroke="rgba(45,212,191,0.7)"
                    strokeWidth="2.5"
                    strokeDasharray="7 7"
                  />
                </svg>
                {/* markers */}
                <span className="absolute left-[24%] top-[30%] flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-400/15 px-2 py-1 text-[10px] font-medium text-emerald-200 backdrop-blur">
                  <Recycle className="size-3" /> Waste
                </span>
                <span className="absolute left-[70%] top-[64%] flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/15 px-2 py-1 text-[10px] font-medium text-amber-200 backdrop-blur">
                  <TrafficCone className="size-3" /> Pothole
                </span>
                <span className="absolute left-[48%] top-[20%] flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-md border border-sky-400/30 bg-sky-400/15 px-2 py-1 text-[10px] font-medium text-sky-200 backdrop-blur">
                  <Camera className="size-3" /> Report
                </span>
                <span className="absolute left-[82%] top-[40%] flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-md border border-rose-400/30 bg-rose-400/15 px-2 py-1 text-[10px] font-medium text-rose-200 backdrop-blur">
                  <Siren className="size-3" /> High Risk
                </span>
                {/* pulsing dots */}
                <span className="absolute left-[24%] top-[30%] size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_16px_4px] shadow-emerald-400/50" />
                <span className="absolute left-[70%] top-[64%] size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 shadow-[0_0_16px_4px] shadow-amber-400/50" />
              </div>
            </div>
          </div>
        </section>

        {/* ====================== CONNECTED ECOSYSTEM =================== */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="text-center">
            <SectionEyebrow>Connected Ecosystem</SectionEyebrow>
            <h2 className="mx-auto mt-5 max-w-2xl text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
              A connected urban intelligence ecosystem
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-pretty leading-relaxed text-neutral-400">
              ECORA creates a continuous intelligence loop between citizens,
              municipal operations, AI-powered detection systems, and city
              authorities.
            </p>
          </div>
          <div className="mt-12 flex flex-wrap items-stretch justify-center gap-3">
            {ECOSYSTEM.map(({ icon: Icon, label }, i) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex w-36 flex-col items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-6 text-center transition-all hover:border-emerald-400/25 hover:bg-white/[0.05]">
                  <span className="flex size-11 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-xs font-medium leading-tight text-neutral-200">
                    {label}
                  </span>
                </div>
                {i < ECOSYSTEM.length - 1 && (
                  <ArrowRight className="hidden size-4 shrink-0 text-emerald-400/50 lg:block" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ============================ WHY ECORA ======================= */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="text-center">
            <SectionEyebrow>Why ECORA</SectionEyebrow>
            <h2 className="mx-auto mt-5 max-w-2xl text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Continuous intelligence for problems invisible to traditional
              systems
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-pretty leading-relaxed text-neutral-400">
              Manual inspections are expensive, inconsistent, and reactive.
              ECORA transforms moving municipal vehicles into intelligent
              sensing networks, providing continuous city-wide monitoring and
              enabling proactive urban management.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                The Old Way
              </span>
              <h3 className="mt-4 text-xl font-semibold text-white">
                Inspections are slow and reactive
              </h3>
              <p className="mt-3 leading-relaxed text-neutral-400">
                Cities rely on manual surveys, scheduled patrols, and scattered
                complaints. Problems are found late, data is fragmented, and
                response is always one step behind the streets.
              </p>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-8">
              <div className="pointer-events-none absolute right-0 top-0 size-40 rounded-full bg-emerald-400/10 blur-3xl" />
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300/80">
                The ECORA Way
              </span>
              <h3 className="mt-4 text-xl font-semibold text-white">
                Continuous AI-driven monitoring
              </h3>
              <p className="mt-3 leading-relaxed text-neutral-300">
                ECORA turns vehicles already on the road into a live sensor
                network. Real-world data streams feed AI that detects, locates,
                and prioritizes issues the moment they appear — proactively, at
                city scale.
              </p>
            </div>
          </div>
        </section>

        {/* ============================= CTA ============================= */}
        <section id="cta" className="mx-auto max-w-6xl px-5 pb-24">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-b from-emerald-400/[0.08] to-transparent px-6 py-16 text-center">
            <div className="pointer-events-none absolute left-1/2 top-0 size-[400px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[120px]" />
            <div className="relative">
              <div className="flex justify-center">
                <SectionEyebrow>Get Started</SectionEyebrow>
              </div>
              <h2 className="mx-auto mt-6 max-w-2xl text-balance text-4xl font-semibold tracking-tight text-white md:text-5xl">
                Build Cleaner, Smarter Cities
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-pretty leading-relaxed text-neutral-300">
                Transform city-wide observations into actionable intelligence
                and empower data-driven urban governance with ECORA.
              </p>
              <Link
                href="/auth"
                className="group mt-9 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-8 py-3.5 text-sm font-semibold text-[#06120d] shadow-[0_0_44px_-8px] shadow-emerald-400/70 transition-all hover:bg-emerald-300"
              >
                Launch ECORA
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ============================ FOOTER =========================== */}
        <footer className="border-t border-white/5">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-neutral-500 sm:flex-row">
            <EcoraLogo />
            <p>
              © {new Date().getFullYear()} ECORA by Ecorian. Real-time urban
              intelligence.
            </p>
          </div>
        </footer>
      </div>
    </main>
  )
}
