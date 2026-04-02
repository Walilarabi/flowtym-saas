/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#6C5CE7",
          light: "#A29BFE",
          dark: "#5B4ED1",
          soft: "#F5F4FE",
          foreground: "hsl(var(--primary-foreground))",
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
        // Flowtym Premium Design System
        ft: {
          primary: '#6C5CE7',
          'primary-light': '#A29BFE',
          'primary-dark': '#5B4ED1',
          'primary-soft': '#F5F4FE',
          success: '#22C55E',
          'success-soft': '#DCFCE7',
          danger: '#EF4444',
          'danger-soft': '#FEE2E2',
          warning: '#F59E0B',
          'warning-soft': '#FEF3C7',
          info: '#3B82F6',
          'info-soft': '#DBEAFE',
          bg: '#F8F9FC',
          card: '#FFFFFF',
          'text-primary': '#1F2937',
          'text-secondary': '#6B7280',
          'text-muted': '#9CA3AF',
          border: '#E5E7EB',
          'border-light': '#F3F4F6',
        },
        flowtym: {
          purple: '#6C5CE7',
          'purple-light': '#A29BFE',
          'purple-dark': '#5B4ED1',
        },
        channel: {
          direct: '#16a34a',
          booking: '#003580',
          expedia: '#FFB300',
          airbnb: '#FF5A5F',
          other: '#64748b',
        },
        shift: {
          matin: '#f97316',
          soir: '#3b82f6',
          nuit: '#8b5cf6',
          repos: '#94a3b8',
          off: '#e2e8f0',
          conge: '#22c55e',
          maladie: '#ef4444',
          ferie: '#a855f7',
        },
        contract: {
          cdi: '#6C5CE7',
          cdd: '#f59e0b',
          extra: '#3b82f6',
          interim: '#f97316',
          stage: '#06b6d4',
          apprentissage: '#ec4899',
        },
      },
      borderRadius: {
        lg: "12px",
        md: "8px",
        sm: "6px",
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.04)',
        'hover': '0 8px 30px rgba(0, 0, 0, 0.06)',
        'lg': '0 12px 40px rgba(0, 0, 0, 0.08)',
        'modal': '0 20px 60px rgba(0, 0, 0, 0.12)',
        'primary': '0 4px 20px rgba(108, 92, 231, 0.25)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        spin: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        spin: "spin 1s linear infinite",
        "fade-in": "fade-in 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
