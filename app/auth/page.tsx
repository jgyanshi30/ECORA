"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, ShieldCheck, User, ArrowRight, Lock } from "lucide-react"

type Role = "citizen" | "admin"

export default function AuthPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role>("citizen")
  const [pending, setPending] = useState(false)
  useEffect(() => {
  const savedRole = localStorage.getItem("ecora_role") as Role | null
  if (savedRole) {
    setRole(savedRole)
  }
}, [])

  function handleContinue() {
    setPending(true)
    const target = role === "citizen" ? "/citizen" : "/dashboard"

localStorage.setItem("ecora_role", role)

setTimeout(() => {
  router.push(target)
}, 600)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070b0a] text-neutral-200">
      {/* ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 size-[640px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-emerald-500/15 blur-[140px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-16">
        {/* brand */}
        <div className="flex flex-col items-center">
          <span className="relative flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-emerald-400/20 bg-white/[0.06]">
            <span className="absolute inset-0 rounded-2xl bg-emerald-400/10 blur-md" />
            <img
              src="/ecora-logo.png"
              alt="ECORA by Ecorian logo"
              className="relative size-14 object-contain"
            />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-[0.18em] text-white">
            ECORA
          </h1>
          <p className="mt-1 text-[11px] font-medium tracking-[0.22em] text-emerald-400/70">
            BY ECORIAN
          </p>
        </div>

        {/* card */}
        <div className="mt-10 w-full rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-emerald-300/80">
            <Lock className="size-3.5" />
            Secure Access
          </div>
          <h2 className="mt-3 text-balance text-xl font-semibold text-white">
            Sign in to the intelligence platform
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            Access real-time urban cleanliness intelligence for your city.
          </p>
          
          {/* google button */}
          <button
           type="button"
           onClick={() => {
            setPending(true)
            setTimeout(() => {
              setPending(false)
              router.push(role === "citizen" ? "/citizen" : "/dashboard")
             }, 1200)
           }}
  className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white px-4 py-3 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100"
>
  <GoogleIcon />
  {pending ? "Signing in with Google..." : "Sign in with Google"}
</button>

          {/* divider */}
          <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-widest text-neutral-500">
            <span className="h-px flex-1 bg-white/10" />
            Select your role
            <span className="h-px flex-1 bg-white/10" />
          </div>

          {/* role selection */}
          <div className="grid grid-cols-2 gap-3">
            <RoleCard
              active={role === "citizen"}
              onClick={() => setRole("citizen")}
              icon={User}
              title="Citizen"
              desc="Report & track issues"
            />
            <RoleCard
              active={role === "admin"}
              onClick={() => setRole("admin")}
              icon={Building2}
              title="Municipal Admin"
              desc="Command center"
            />
          </div>

          <button
            type="button"
            onClick={handleContinue}
            disabled={pending}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-70"
          >
            {pending ? "Entering platform…" : "Continue"}
            {!pending && <ArrowRight className="size-4" />}
          </button>
        </div>

        <p className="mt-6 flex items-center gap-1.5 text-xs text-neutral-500">
          <ShieldCheck className="size-3.5 text-emerald-400/70" />
          Government-grade security · Role-based access
        </p>

        <button
         type="button"
         onClick={() => router.push("/")}
         className="mt-4 flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-neutral-300 hover:text-white hover:border-white/20 transition"
        >
         ← Back to Landing Page
        </button>
      </div>
    </main>
  )
}

function RoleCard({
  active,
  onClick,
  icon: Icon,
  title,
  desc,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition ${
        active
          ? "border-emerald-400/50 bg-emerald-400/10"
          : "border-white/10 bg-white/[0.02] hover:border-white/20"
      }`}
    >
      <span
        className={`flex size-9 items-center justify-center rounded-lg border ${
          active
            ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
            : "border-white/10 bg-white/[0.04] text-neutral-400"
        }`}
      >
        <Icon className="size-4" />
      </span>
      <span className="text-sm font-medium text-white">{title}</span>
      <span className="text-[11px] leading-tight text-neutral-400">{desc}</span>
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}
