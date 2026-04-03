/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // ── Design system tokens ──────────────────────────────────────
        primary: {
          DEFAULT:          "#00386c",
          container:        "#1a4f8b",
          fixed:            "#d5e3ff",
          "fixed-dim":      "#a6c8ff",
        },
        "on-primary":                "#ffffff",
        "on-primary-container":      "#9bc2ff",
        "on-primary-fixed":          "#001c3b",
        "on-primary-fixed-variant":  "#0c4783",
        "surface-tint":              "#2f5f9c",
        "inverse-primary":           "#a6c8ff",

        secondary: {
          DEFAULT:          "#006a63",
          container:        "#8bf1e6",
          fixed:            "#8ef4e9",
          "fixed-dim":      "#71d7cd",
        },
        "on-secondary":                "#ffffff",
        "on-secondary-container":      "#006f67",
        "on-secondary-fixed":          "#00201d",
        "on-secondary-fixed-variant":  "#00504a",

        tertiary: {
          DEFAULT:          "#6b1b00",
          container:        "#932800",
          fixed:            "#ffdbd0",
          "fixed-dim":      "#ffb59f",
        },
        "on-tertiary":                "#ffffff",
        "on-tertiary-container":      "#ffac93",
        "on-tertiary-fixed":          "#3a0a00",
        "on-tertiary-fixed-variant":  "#852300",

        surface: {
          DEFAULT:           "#f6fafe",
          dim:               "#d6dade",
          bright:            "#f6fafe",
          "container-lowest": "#ffffff",
          "container-low":   "#f0f4f8",
          container:         "#eaeef2",
          "container-high":  "#e4e9ed",
          "container-highest":"#dfe3e7",
          variant:           "#dfe3e7",
        },
        "on-surface":         "#171c1f",
        "on-surface-variant": "#424750",
        "inverse-surface":    "#2c3134",
        "inverse-on-surface": "#edf1f5",

        outline:         "#737781",
        "outline-variant":"#c2c6d1",

        error: {
          DEFAULT:   "#ba1a1a",
          container: "#ffdad6",
        },
        "on-error":           "#ffffff",
        "on-error-container": "#93000a",

        // ── Backward-compat tokens for @apply in index.css ────────────
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
      },

      borderRadius: {
        DEFAULT: "0.25rem",
        lg:      "0.5rem",
        xl:      "0.75rem",
        "2xl":   "1rem",
        "3xl":   "1.5rem",
        full:    "9999px",
      },

      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        body:     ["Inter", "sans-serif"],
        label:    ["Inter", "sans-serif"],
      },

      // Kept for any component using accordion animations
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
