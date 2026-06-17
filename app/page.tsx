export default function Home() {
  return (
    <main className="min-h-screen bg-[#070B14] text-white relative overflow-hidden">

      {/* BACKGROUND GLOW LAYERS */}
      <div className="absolute w-[600px] h-[600px] bg-cyan-500/20 blur-[140px] rounded-full top-[-200px] right-[-200px]" />
      <div className="absolute w-[500px] h-[500px] bg-blue-500/10 blur-[140px] rounded-full bottom-[-200px] left-[-200px]" />

      {/* NAVBAR */}
      <header className="relative z-10 flex justify-between items-center px-12 py-6 border-b border-white/10 backdrop-blur-xl">
        <h1 className="text-xl font-semibold tracking-wide">
          ECORA
        </h1>

        <div className="flex gap-3">
          <button className="px-4 py-2 text-sm text-white/70 hover:text-white">
            Features
          </button>

          <button className="px-4 py-2 text-sm text-white/70 hover:text-white">
            About
          </button>

          <button className="px-5 py-2 rounded-xl bg-cyan-500 text-black font-medium hover:scale-105 transition">
            Enter System
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 grid md:grid-cols-2 gap-16 px-12 py-24 items-center">

        {/* LEFT CONTENT */}
        <div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 mb-6">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
            Real-Time Urban Intelligence System
          </div>

          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            Detect Waste & Potholes <br />
            Using <span className="text-cyan-400">AI + Dashcam Data</span>
          </h1>

          <p className="mt-6 text-white/60 text-lg leading-relaxed max-w-xl">
            ECORA converts moving vehicle feeds and citizen reports into a live
            geospatial intelligence system that helps cities identify and resolve
            urban cleanliness issues in real time.
          </p>

          {/* CTA */}
          <div className="flex gap-4 mt-8">
            <button className="px-6 py-3 rounded-xl bg-cyan-500 text-black font-medium hover:scale-105 transition">
              Get Started
            </button>

            <button className="px-6 py-3 rounded-xl border border-white/15 text-white/80 hover:bg-white/5 transition">
              View Demo
            </button>
          </div>

          {/* TAGS */}
          <div className="flex flex-wrap gap-3 mt-10 text-xs text-white/50">
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
              AI Detection
            </span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
              Geo Mapping
            </span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
              Real-Time Alerts
            </span>
          </div>

        </div>

        {/* RIGHT VISUAL */}
        <div className="relative">

          {/* MAIN DASHBOARD CARD */}
          <div className="h-[450px] rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">

            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm text-white/70">
                Live City Heatmap
              </h3>

              <span className="text-xs text-cyan-400 animate-pulse">
                ● LIVE
              </span>
            </div>

            {/* GRID MAP SIMULATION */}
            <div className="grid grid-cols-8 gap-2 h-full">
              {Array.from({ length: 64 }).map((_, i) => (
                <div
                  key={i}
                  className={`rounded-md transition ${
                    i % 11 === 0
                      ? "bg-red-500/60"
                      : i % 7 === 0
                      ? "bg-yellow-500/40"
                      : "bg-white/5"
                  }`}
                />
              ))}
            </div>

          </div>

          {/* FLOATING ALERTS */}
          <div className="absolute top-6 left-6 px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-lg">
            ⚠ High Waste Zone
          </div>

          <div className="absolute bottom-6 right-6 px-3 py-2 bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs rounded-lg">
            📍 Geo-Tagged Event
          </div>

        </div>
      </section>

      {/* FEATURES */}
      <section className="relative z-10 px-12 py-20">

        <h2 className="text-3xl font-semibold text-center mb-12">
          Core Capabilities
        </h2>

        <div className="grid md:grid-cols-3 gap-6">

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="font-semibold text-lg">Real-Time Detection</h3>
            <p className="text-white/60 mt-2 text-sm">
              Processes dashcam streams and citizen uploads to detect waste and potholes instantly.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="font-semibold text-lg">Geo Intelligence</h3>
            <p className="text-white/60 mt-2 text-sm">
              Automatically maps detections with precise location tagging and timestamps.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="font-semibold text-lg">City Heatmap Engine</h3>
            <p className="text-white/60 mt-2 text-sm">
              Visualizes urban cleanliness and infrastructure health in real time.
            </p>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 px-12 py-10 border-t border-white/10 text-center text-white/40 text-sm">
        ECORA — Urban Intelligence System for Smart Cities
      </footer>

    </main>
  );
}