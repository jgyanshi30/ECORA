import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

// CLAUDE.md §2 design tokens.
// - Primary: deep teal → forest green range, exactly #0F5C4E (HSL 169 72% 21%)
//   at the 600 step and #14532D (HSL 144 61% 20%) at the 800 step — both
//   literal spec hexes, with the rest of the ramp interpolated between them
//   for hover/tint/surface use.
// - Background: white / light grey (#F7F9F8) — see --background below.
// - Status/risk semantic colors (red/amber/blue/green/purple/neutral) use
//   Tailwind's own stock palettes (already accessible out of the box), not a
//   bespoke scale — see components/domain/status-badge.tsx and risk-badge.tsx.
const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "#EFF7F4",
          100: "#DCEEE7",
          200: "#B8DDCF",
          300: "#8FC9B4",
          400: "#5FA98F",
          500: "#2F7F68",
          600: "#0F5C4E",
          700: "#115228",
          800: "#14532D",
          900: "#0E3C20",
          950: "#082414",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        // CLAUDE.md §2: the one restrained animated visual in the app (landing
        // hero only, never a functional screen) — a slow, seamless horizontal
        // drift across two identical tiled copies of the same wave shape.
        "wave-drift": { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "wave-drift": "wave-drift 26s linear infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
