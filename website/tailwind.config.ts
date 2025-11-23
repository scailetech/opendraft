const animate = require("tailwindcss-animate");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  safelist: ["dark"],
  prefix: "",

  content: [
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],

  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
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
          hover: "hsl(var(--card-hover))",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        pill: "999px", /* Cursor-style fully rounded buttons */
        cursor: "4px", /* Cursor's card radius */
      },
      spacing: {
        /* Cursor grid-based spacing (g units, base = 10px / 0.625rem) */
        "g-0.25": "calc(0.625rem * 0.25)", /* 2.5px */
        "g-0.5": "calc(0.625rem * 0.5)",   /* 5px */
        "g-0.75": "calc(0.625rem * 0.75)", /* 7.5px */
        "g-1": "0.625rem",                  /* 10px */
        "g-1.5": "calc(0.625rem * 1.5)",   /* 15px */
        "g-2": "calc(0.625rem * 2)",       /* 20px */
        "g-2.5": "calc(0.625rem * 2.5)",   /* 25px */
        "g-3": "calc(0.625rem * 3)",       /* 30px */
        /* Cursor vertical rhythm (v units, base = 1.4rem / 22.4px) */
        "v-1": "1.4rem",
        "v-1.5": "calc(1.4rem * 1.5)",
        "v-2": "calc(1.4rem * 2)",
        "v-3": "calc(1.4rem * 3)",
        "v-4": "calc(1.4rem * 4)",
      },
      transitionDuration: {
        cursor: "140ms",       /* Cursor's fast transition */
        "cursor-slow": "250ms", /* Cursor's slow transition */
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.25, 1, 0.5, 1)", /* Cursor's spring ease */
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "collapsible-down": {
          from: { height: 0 },
          to: { height: "var(--radix-collapsible-content-height)" },
        },
        "collapsible-up": {
          from: { height: "var(--radix-collapsible-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "collapsible-down": "collapsible-down 0.2s ease-in-out",
        "collapsible-up": "collapsible-up 0.2s ease-in-out",
      },
    },
  },
  plugins: [animate, require('@tailwindcss/typography')],
};
