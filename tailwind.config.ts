import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // dark mode via class (matches our .dark {} in globals.css)
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Paper layers — light "paper" mode (matches DS TL.light)
        canvas:  "#F4F1E8",
        surface: "#FBF8EF",
        raised:  "#FFFCF4",

        // Rules / borders (DS TL.light.rule / ruleSoft)
        rule: {
          DEFAULT: "#E3DECF",
          soft:    "#EBE6D8",
          strong:  "#CFC9B8",
        },

        // Ink (DS TL.light.ink / inkDim / inkFaint)
        ink: {
          DEFAULT: "#1A1814",
          dim:     "#5C564B",
          faint:   "#8B8678",
        },

        // Brand red (DS TL.red / redInk / redSoft / redSoftDark)
        brand: {
          DEFAULT:  "#DB4842",
          ink:      "#B83A35",
          soft:     "#F4D8D6",
          softDark: "#3A2220",
        },

        // Semantic engagement states (DS TL.scope / recon / patched / signal)
        scope:   { DEFAULT: "#4D7C84", tint: "#DCE7E8" },
        recon:   { DEFAULT: "#6E6B96", tint: "#E4E1EC" },
        patched: { DEFAULT: "#6E8462", tint: "#DFE5D8" },
        signal:  { DEFAULT: "#BC8438", tint: "#F1E1C8" },
      },

      fontFamily: {
        // DS: TL.serif / TL.sans / TL.mono
        serif: ["Newsreader", "Georgia", "serif"],
        sans:  ["IBM Plex Sans", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono:  ["JetBrains Mono", "IBM Plex Mono", "ui-monospace", "Menlo", "monospace"],
      },

      fontSize: {
        "2xs": ["0.7rem",  { lineHeight: "1rem" }],
        xs:    ["0.8rem",  { lineHeight: "1.2rem" }],
        sm:    ["0.875rem",{ lineHeight: "1.4rem" }],
      },

      borderRadius: {
        // DS TL.radius: xs:4 sm:6 md:8 lg:10 xl:14 pill:999
        xs:      "4px",
        sm:      "6px",
        DEFAULT: "8px",
        md:      "8px",
        lg:      "10px",
        xl:      "14px",
        pill:    "999px",
      },

      animation: {
        "fade-in":   "fadeIn 0.15s ease-out",
        "slide-in":  "slideIn 0.18s ease-out",
        "pulse-red": "pulseRed 2s ease-in-out infinite",
        "tl-pulse":  "tlPulse 1s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:   { from: { opacity: "0" },                          to: { opacity: "1" } },
        slideIn:  { from: { opacity: "0", transform: "translateX(-6px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        pulseRed: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.4" } },
        tlPulse:  { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.3" } },
      },
    },
  },
  plugins: [],
};

export default config;
