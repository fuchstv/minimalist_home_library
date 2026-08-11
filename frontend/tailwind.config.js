/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      "colors": {
              "primary": "#0284c7",
              "primary-container": "#0369a1",
              "on-primary": "#ffffff",
              "on-primary-container": "#e0f2fe",
              "primary-fixed": "#e0f2fe",
              "primary-fixed-dim": "#38bdf8",
              "secondary": "#f43f5e",
              "secondary-container": "#881337",
              "on-secondary": "#ffffff",
              "on-background": "var(--on-background)",
              "surface-container-highest": "var(--surface-container-highest)",
              "surface-variant": "var(--surface-container-highest)",
              "on-surface-variant": "var(--on-surface-variant)",
              "tertiary-container": "#0369a1",
              "surface-bright": "#1e293b",
              "on-tertiary": "#ffffff",
              "surface-container-lowest": "var(--surface-container-lowest)",
              "outline": "var(--outline)",
              "error": "#f43f5e",
              "surface-container": "var(--surface-container)",
              "error-container": "#881337",
              "outline-variant": "var(--outline-variant)",
              "on-error": "#ffffff",
              "surface-container-low": "var(--surface-container-low)",
              "surface": "var(--surface)",
              "deep-black": "#020617",
              "surface-container-high": "var(--surface-container-high)",
              "inverse-on-surface": "var(--inverse-on-surface)",
              "surface-tint": "#38bdf8",
              "on-surface": "var(--on-surface)",
              "surface-dim": "#0f172a",
              "inverse-surface": "var(--inverse-surface)",
              "background": "var(--background)",
              "white": "#FFFFFF"
      },
      "borderRadius": {
              "DEFAULT": "0.5rem",
              "lg": "0.75rem",
              "xl": "1rem",
              "2xl": "1.5rem",
              "full": "9999px"
      },
      "spacing": {
              "margin-desktop": "32px",
              "section-gap-md": "48px",
              "section-gap-lg": "80px",
              "margin-mobile": "16px",
              "gutter": "24px",
              "base": "8px",
              "container-max-width": "1200px"
      },
      "fontFamily": {
              "headline-md": ["Outfit", "Inter", "sans-serif"],
              "headline-lg": ["Outfit", "Inter", "sans-serif"],
              "body-md": ["Inter", "sans-serif"],
              "body-sm": ["Inter", "sans-serif"],
              "label-md": ["Inter", "sans-serif"],
              "label-lg": ["Inter", "sans-serif"],
              "body-lg": ["Inter", "sans-serif"],
              "headline-xl": ["Outfit", "Inter", "sans-serif"],
              "headline-lg-mobile": ["Outfit", "Inter", "sans-serif"]
      }
    },
  },
  plugins: [],
}
