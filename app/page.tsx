export default function Home() {
  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes gradient-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
        @keyframes scan-line {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delay-1 { animation: float 6s ease-in-out 1s infinite; }
        .animate-float-delay-2 { animation: float 7s ease-in-out 2s infinite; }
        .animate-float-delay-3 { animation: float 5s ease-in-out 1.5s infinite; }
        .animate-pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
        .animate-pulse-ring { animation: pulse-ring 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .animate-shimmer {
          background-size: 200% auto;
          animation: shimmer 4s linear infinite;
        }
        .animate-gradient-drift { animation: gradient-drift 20s ease-in-out infinite; }
        .animate-scan-line { animation: scan-line 4s ease-in-out infinite; }
        .animate-fade-up { animation: fade-up 0.8s ease-out forwards; }
        html { scroll-behavior: smooth; }
      `}</style>

      <div className="relative min-h-screen overflow-x-hidden bg-[#030712] text-white selection:bg-emerald-500/30">
        {/* Ambient background */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="animate-gradient-drift absolute -left-32 top-0 h-[600px] w-[600px] rounded-full bg-emerald-500/10 blur-[120px]" />
          <div className="animate-gradient-drift absolute -right-32 top-1/3 h-[500px] w-[500px] rounded-full bg-teal-500/8 blur-[100px]" style={{ animationDelay: "5s" }} />
          <div className="absolute bottom-0 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-600/5 blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
        </div>

        {/* Navigation */}
        <nav className="relative z-50 border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-lg font-semibold tracking-tight">ECORA</span>
            </div>
            <div className="hidden items-center gap-8 text-sm text-white/60 md:flex">
              <a href="#detection" className="transition-colors hover:text-white">Detection</a>
              <a href="#dashboard" className="transition-colors hover:text-white">Dashboard</a>
              <a href="#hotspots" className="transition-colors hover:text-white">Hotspots</a>
              <a href="#predictive" className="transition-colors hover:text-white">Predictive AI</a>
              <a href="#architecture" className="transition-colors hover:text-white">Architecture</a>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xs font-medium text-emerald-400">Live System</span>
            </div>
          </div>
        </nav>

        {/* SECTION 1: HERO */}
        <section className="relative z-10 px-6 pb-32 pt-24 lg:px-8 lg:pt-32">
          <div className="mx-auto max-w-7xl">
            <div className="relative flex flex-col items-center text-center">
              {/* Floating intelligence cards */}
              <div className="animate-float-delay-1 absolute left-0 top-16 hidden rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl lg:block">
                <p className="text-2xl font-bold text-emerald-400">12,457</p>
                <p className="text-xs text-white/50">Waste Detections</p>
              </div>
              <div className="animate-float-delay-2 absolute right-0 top-24 hidden rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl lg:block">
                <p className="text-2xl font-bold text-amber-400">43</p>
                <p className="text-xs text-white/50">Active Hotspots</p>
              </div>
              <div className="animate-float-delay-3 absolute -left-4 bottom-32 hidden rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl xl:block">
                <p className="text-2xl font-bold text-emerald-400">87%</p>
                <p className="text-xs text-white/50">Cleanliness Score</p>
              </div>
              <div className="animate-float absolute -right-4 bottom-24 hidden rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl xl:block">
                <p className="text-2xl font-bold text-emerald-300">+27%</p>
                <p className="text-xs text-white/50">Predicted Improvement</p>
              </div>

              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
                <span className="text-xs font-medium tracking-wide text-emerald-400/90">ENVIRONMENTAL INTELLIGENCE PLATFORM</span>
              </div>

              <h1 className="mb-6 bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-7xl font-bold tracking-tighter text-transparent sm:text-8xl lg:text-9xl">
                ECORA
              </h1>

              <p className="mb-4 text-xl font-medium tracking-tight text-emerald-400/90 sm:text-2xl">
                AI-Powered Urban Environmental Intelligence
              </p>

              <p className="mb-10 max-w-2xl text-base leading-relaxed text-white/50 sm:text-lg">
                Transforming vehicles, citizens, and geospatial intelligence into a real-time environmental monitoring and action network.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <a
                  href="#detection"
                  className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:brightness-110"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  View Live AI Detection
                </a>
                <a
                  href="#predictive"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/10"
                >
                  Explore Intelligence
                  <svg className="h-4 w-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>

              {/* Mobile floating stats */}
              <div className="mt-16 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4 lg:hidden">
                {[
                  { value: "12,457", label: "Waste Detections", color: "text-emerald-400" },
                  { value: "43", label: "Active Hotspots", color: "text-amber-400" },
                  { value: "87%", label: "Cleanliness Score", color: "text-emerald-400" },
                  { value: "+27%", label: "Predicted Improvement", color: "text-emerald-300" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
                    <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-[10px] text-white/50">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: REAL-TIME AI DETECTION */}
        <section id="detection" className="relative z-10 px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12">
              <p className="mb-2 text-sm font-medium tracking-widest text-emerald-400/80">LIVE MONITORING</p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Real-Time AI Detection</h2>
              <p className="mt-3 max-w-xl text-white/50">
                YOLOv11-powered computer vision analyzing urban environments through vehicle-mounted dashcam streams in real time.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <video
                  src="/school_2_output (1).mp4"
                  controls
                  autoPlay
                  muted
                  loop
                  className="w-full rounded-2xl"
                />
              </div>

              {/* AI Control Panel */}
              <div className="flex flex-col gap-4 lg:col-span-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                  <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-sm font-semibold tracking-wide text-white/90">AI Control Panel</h3>
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
                      ACTIVE
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Model", value: "YOLOv11" },
                      { label: "Status", value: "Active", highlight: true },
                      { label: "Avg Confidence", value: "92%" },
                      { label: "Detection Speed", value: "32 FPS" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-white/5 bg-black/20 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-white/40">{item.label}</p>
                        <p className={`mt-1 text-sm font-semibold ${item.highlight ? "text-emerald-400" : "text-white"}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                  <h3 className="mb-4 text-sm font-semibold tracking-wide text-white/90">Live Feed</h3>
                  <div className="space-y-3">
                    {[
                      { label: "Plastic Waste Detected", confidence: 91, color: "emerald" },
                      { label: "Garbage Pile Detected", confidence: 88, color: "amber" },
                      { label: "Illegal Dumping Area", confidence: 94, color: "red" },
                      { label: "Roadside Waste Cluster", confidence: 90, color: "emerald" },
                    ].map((detection) => (
                      <div key={detection.label} className="rounded-xl border border-white/5 bg-black/20 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className={`animate-pulse-ring absolute inline-flex h-full w-full rounded-full ${detection.color === "red" ? "bg-red-400" : detection.color === "amber" ? "bg-amber-400" : "bg-emerald-400"}`} />
                              <span className={`relative inline-flex h-2 w-2 rounded-full ${detection.color === "red" ? "bg-red-400" : detection.color === "amber" ? "bg-amber-400" : "bg-emerald-400"}`} />
                            </span>
                            <span className="text-xs font-medium text-white/80">{detection.label}</span>
                          </div>
                          <span className="text-xs font-bold text-emerald-400">{detection.confidence}%</span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full ${detection.color === "red" ? "bg-red-400" : detection.color === "amber" ? "bg-amber-400" : "bg-emerald-400"}`}
                            style={{ width: `${detection.confidence}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: ENVIRONMENTAL INTELLIGENCE DASHBOARD */}
        <section id="dashboard" className="relative z-10 px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12">
              <p className="mb-2 text-sm font-medium tracking-widest text-emerald-400/80">ANALYTICS</p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Environmental Intelligence Dashboard</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {[
                { label: "Garbage Detections", value: "12,457", icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16", trend: null },
                { label: "Active Hotspots", value: "43", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z", trend: null },
                { label: "Citizen Reports", value: "1,827", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", trend: null },
                { label: "Cleanliness Score", value: "87%", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", trend: "up" },
                { label: "Waste Reduction Trend", value: "+18%", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", trend: "up" },
                { label: "Predicted Risk", value: "High", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z", trend: "risk" },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="group rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition-all hover:border-emerald-500/20 hover:bg-white/[0.07]"
                >
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                    <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={kpi.icon} />
                    </svg>
                  </div>
                  <p className={`text-2xl font-bold ${kpi.trend === "risk" ? "text-amber-400" : kpi.trend === "up" ? "text-emerald-400" : "text-white"}`}>
                    {kpi.value}
                  </p>
                  <p className="mt-1 text-xs text-white/50">{kpi.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 4: HOTSPOT INTELLIGENCE MAP */}
        <section id="hotspots" className="relative z-10 px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12">
              <p className="mb-2 text-sm font-medium tracking-widest text-emerald-400/80">GEOSPATIAL</p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Hotspot Intelligence Map</h2>
              <p className="mt-3 max-w-xl text-white/50">
                AI-generated waste density mapping with real-time risk classification across urban sectors.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Map Mockup */}
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 lg:col-span-2">
                <div className="border-b border-white/10 px-5 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white/60">Urban Waste Density Map</span>
                    <div className="flex items-center gap-4 text-[10px] text-white/50">
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />Critical</span>
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Warning</span>
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" />Clean</span>
                    </div>
                  </div>
                </div>
                <div className="relative aspect-[16/10] bg-[#0a1628]">
                  {/* Grid roads */}
                  <svg className="absolute inset-0 h-full w-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(52,211,153,0.3)" strokeWidth="0.5" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                    <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
                    <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
                    <line x1="20%" y1="0" x2="20%" y2="100%" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="80%" y1="0" x2="80%" y2="100%" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="0" y1="30%" x2="100%" y2="30%" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="0" y1="70%" x2="100%" y2="70%" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  </svg>

                  {/* Heat zones */}
                  <div className="absolute left-[15%] top-[20%] h-28 w-32 rounded-full bg-red-500/15 blur-2xl" />
                  <div className="absolute left-[55%] top-[45%] h-24 w-28 rounded-full bg-amber-400/12 blur-2xl" />
                  <div className="absolute right-[15%] bottom-[20%] h-32 w-36 rounded-full bg-emerald-400/10 blur-2xl" />

                  {/* Markers */}
                  {[
                    { x: "22%", y: "28%", color: "bg-red-500", ring: "border-red-500/50", label: "Critical" },
                    { x: "38%", y: "55%", color: "bg-red-500", ring: "border-red-500/50", label: "" },
                    { x: "58%", y: "48%", color: "bg-amber-400", ring: "border-amber-400/50", label: "" },
                    { x: "72%", y: "35%", color: "bg-amber-400", ring: "border-amber-400/50", label: "" },
                    { x: "78%", y: "68%", color: "bg-emerald-400", ring: "border-emerald-400/50", label: "" },
                    { x: "45%", y: "22%", color: "bg-emerald-400", ring: "border-emerald-400/50", label: "" },
                    { x: "15%", y: "72%", color: "bg-emerald-400", ring: "border-emerald-400/50", label: "" },
                  ].map((marker, i) => (
                    <div key={i} className="absolute" style={{ left: marker.x, top: marker.y }}>
                      <span className={`absolute -inset-2 rounded-full ${marker.color} opacity-30 animate-pulse-ring`} />
                      <span className={`relative block h-3 w-3 rounded-full ${marker.color} ring-2 ${marker.ring}`} />
                    </div>
                  ))}

                  <div className="absolute bottom-4 left-4 rounded-lg border border-white/10 bg-black/50 px-3 py-2 backdrop-blur-md">
                    <p className="text-[10px] text-white/50">Last updated</p>
                    <p className="text-xs font-medium text-emerald-400">2 seconds ago</p>
                  </div>
                </div>
              </div>

              {/* Hotspot Cards */}
              <div className="flex flex-col gap-4">
                {[
                  { sector: "Sector 7", risk: "High Risk", density: "94%", color: "red", bar: 94 },
                  { sector: "Central Market", risk: "Medium Risk", density: "67%", color: "amber", bar: 67 },
                  { sector: "School Zone", risk: "Low Risk", density: "23%", color: "emerald", bar: 23 },
                ].map((hotspot) => (
                  <div key={hotspot.sector} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-white">{hotspot.sector}</h3>
                        <p className={`text-xs font-medium ${hotspot.color === "red" ? "text-red-400" : hotspot.color === "amber" ? "text-amber-400" : "text-emerald-400"}`}>
                          {hotspot.risk}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-white/40">Waste Density</p>
                        <p className="text-lg font-bold text-white">{hotspot.density}</p>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${hotspot.color === "red" ? "bg-red-500" : hotspot.color === "amber" ? "bg-amber-400" : "bg-emerald-400"}`}
                        style={{ width: `${hotspot.bar}%` }}
                      />
                    </div>
                  </div>
                ))}

                <div className="mt-auto rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                  <p className="text-xs font-medium text-emerald-400">Intelligence Summary</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">
                    3 critical zones require immediate municipal intervention. Sector 7 shows accelerating waste accumulation patterns.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: PREDICTIVE AI ENGINE */}
        <section id="predictive" className="relative z-10 px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-emerald-500/5 to-transparent p-8 backdrop-blur-xl sm:p-12">
              <div className="mb-10 max-w-2xl">
                <p className="mb-2 text-sm font-medium tracking-widest text-emerald-400/80">FORECASTING</p>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Predictive Environmental Intelligence</h2>
                <p className="mt-4 text-white/50 leading-relaxed">
                  ECORA not only detects waste but predicts future accumulation zones before they become critical.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Predicted Waste Growth", value: "+27%", desc: "Next 30 days", accent: "text-emerald-400" },
                  { label: "Highest Risk Zone", value: "Sector 7", desc: "Critical priority", accent: "text-red-400" },
                  { label: "Recommended Action", value: "Deploy Cleanup Team", desc: "Immediate response", accent: "text-amber-400" },
                  { label: "Projected Impact", value: "31% Waste Reduction", desc: "If action taken within 48h", accent: "text-emerald-400" },
                ].map((card) => (
                  <div key={card.label} className="rounded-2xl border border-white/10 bg-black/30 p-6 transition-all hover:border-emerald-500/20">
                    <p className="text-xs text-white/40">{card.label}</p>
                    <p className={`mt-2 text-xl font-bold ${card.accent}`}>{card.value}</p>
                    <p className="mt-1 text-[11px] text-white/30">{card.desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center gap-4 rounded-2xl border border-white/5 bg-black/20 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                  <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <p className="text-sm leading-relaxed text-white/60">
                  Our predictive engine analyzes historical detection patterns, seasonal trends, and citizen report velocity to forecast waste hotspots 7–14 days before they reach critical thresholds — enabling proactive municipal response.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: CITIZEN REWARD NETWORK */}
        <section id="rewards" className="relative z-10 px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12">
              <p className="mb-2 text-sm font-medium tracking-widest text-emerald-400/80">COMMUNITY</p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Citizen Reward Network</h2>
              <p className="mt-3 max-w-xl text-white/50">
                Gamified environmental participation driving community-led cleanliness at scale.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* User Stats */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-xl font-bold shadow-lg shadow-emerald-500/20">
                    N
                  </div>
                  <div>
                    <p className="font-semibold">Your Profile</p>
                    <p className="text-xs text-emerald-400">Eco Warrior</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-white/5 bg-black/20 p-3 text-center">
                    <p className="text-lg font-bold text-emerald-400">2,450</p>
                    <p className="text-[10px] text-white/40">Eco Points</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-black/20 p-3 text-center">
                    <p className="text-lg font-bold text-white">#12</p>
                    <p className="text-[10px] text-white/40">Current Rank</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-black/20 p-3 text-center">
                    <p className="text-lg font-bold text-amber-400">🏅</p>
                    <p className="text-[10px] text-white/40">Eco Warrior</p>
                  </div>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <h3 className="mb-4 text-sm font-semibold text-white/90">Leaderboard</h3>
                <div className="space-y-3">
                  {[
                    { rank: 1, name: "Aarav", points: 520, medal: "🥇" },
                    { rank: 2, name: "Priya", points: 480, medal: "🥈" },
                    { rank: 3, name: "Rohan", points: 430, medal: "🥉" },
                    { rank: 4, name: "Ananya", points: 410, medal: "" },
                  ].map((user) => (
                    <div key={user.name} className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-4 py-3">
                      <span className="w-6 text-center text-sm">{user.medal || `#${user.rank}`}</span>
                      <span className="flex-1 text-sm font-medium">{user.name}</span>
                      <span className="text-sm font-bold text-emerald-400">{user.points}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Achievements */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <h3 className="mb-4 text-sm font-semibold text-white/90">Achievements</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { title: "First Report", desc: "Submitted 1 report", unlocked: true },
                    { title: "Hotspot Hunter", desc: "Found 5 hotspots", unlocked: true },
                    { title: "Clean Streak", desc: "7-day activity", unlocked: true },
                    { title: "City Guardian", desc: "50 reports filed", unlocked: false },
                  ].map((badge) => (
                    <div
                      key={badge.title}
                      className={`rounded-xl border p-3 ${badge.unlocked ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/5 bg-black/20 opacity-50"}`}
                    >
                      <p className="text-lg">{badge.unlocked ? "✅" : "🔒"}</p>
                      <p className="mt-1 text-xs font-semibold">{badge.title}</p>
                      <p className="text-[10px] text-white/40">{badge.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7: WHY ECORA MATTERS */}
        <section className="relative z-10 px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <p className="mb-2 text-sm font-medium tracking-widest text-emerald-400/80">IMPACT</p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Why ECORA Matters</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "Real-Time Monitoring",
                  desc: "Continuous environmental sensing through existing vehicle infrastructure — turning every dashcam into an intelligent waste detection node.",
                  icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
                },
                {
                  title: "Predictive Intelligence",
                  desc: "Machine learning models forecast waste accumulation patterns, enabling municipalities to act before problems escalate into health hazards.",
                  icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
                },
                {
                  title: "Citizen Participation",
                  desc: "Gamified reporting and reward systems mobilize communities to complement AI detection with ground-truth environmental data.",
                  icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
                },
                {
                  title: "Smart City Integration",
                  desc: "Seamlessly connects with municipal GIS systems and urban planning workflows for data-driven environmental governance.",
                  icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/5"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10">
                    <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                    </svg>
                  </div>
                  <h3 className="mb-2 font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-white/50">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 8: SYSTEM ARCHITECTURE */}
        <section id="architecture" className="relative z-10 px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <p className="mb-2 text-sm font-medium tracking-widest text-emerald-400/80">PIPELINE</p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">System Architecture</h2>
              <p className="mx-auto mt-3 max-w-xl text-white/50">
                End-to-end environmental intelligence pipeline from edge detection to municipal action.
              </p>
            </div>

            <div className="flex flex-col items-center gap-0">
              {[
                { step: "Dashcam Streams", desc: "Vehicle-mounted camera feeds across the city", icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
                { step: "YOLOv11 Detection", desc: "Real-time object detection and classification", icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
                { step: "Geo-tagging Layer", desc: "GPS-enriched spatial metadata for each detection", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" },
                { step: "GIS Intelligence", desc: "Geospatial analysis and density mapping", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
                { step: "Hotspot Prediction", desc: "ML-powered forecasting of waste accumulation zones", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
                { step: "Municipal Dashboard", desc: "Actionable intelligence for city administrators", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" },
              ].map((node, i, arr) => (
                <div key={node.step} className="flex w-full max-w-lg flex-col items-center">
                  <div className="group w-full rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition-all hover:border-emerald-500/30 hover:bg-white/[0.07]">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/20 to-emerald-600/10">
                        <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={node.icon} />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{node.step}</h3>
                        <p className="text-xs text-white/50">{node.desc}</p>
                      </div>
                      <span className="ml-auto rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="flex flex-col items-center py-2">
                      <div className="h-6 w-px bg-gradient-to-b from-emerald-500/50 to-emerald-500/10" />
                      <svg className="h-4 w-4 text-emerald-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 9: AI RESEARCH POSITIONING */}
        <section className="relative z-10 px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <p className="mb-2 text-sm font-medium tracking-widest text-emerald-400/80">RESEARCH</p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">AI Research Positioning</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { domain: "Computer Vision", tech: "YOLOv11", highlight: true },
                { domain: "Geospatial Intelligence", tech: "GIS + ML", highlight: false },
                { domain: "Predictive Analytics", tech: "Time-Series ML", highlight: false },
                { domain: "Smart City Intelligence", tech: "IoT Fusion", highlight: false },
                { domain: "Environmental Informatics", tech: "Data Science", highlight: false },
              ].map((item) => (
                <div
                  key={item.domain}
                  className={`rounded-2xl border p-5 text-center backdrop-blur-xl transition-all hover:-translate-y-0.5 ${
                    item.highlight
                      ? "border-emerald-500/30 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <p className="text-sm font-semibold text-white">{item.domain}</p>
                  <p className={`mt-2 text-xs font-medium ${item.highlight ? "text-emerald-400" : "text-white/40"}`}>
                    {item.tech}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 10: FOOTER */}
        <footer className="relative z-10 border-t border-white/5 px-6 py-20 lg:px-8">
          <div className="mx-auto max-w-7xl text-center">
            <h2 className="mx-auto max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              Building Cleaner Cities Through{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Environmental Intelligence
              </span>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/50">
              ECORA transforms ordinary vehicles into intelligent environmental sensing networks capable of detecting, mapping, and predicting urban waste accumulation in real time.
            </p>
            <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-5 py-2">
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm font-medium text-emerald-400">Built for OSC AI Build 1.0</span>
            </div>
            <div className="mt-16 flex items-center justify-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-semibold tracking-tight text-white/60">ECORA © 2026</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
