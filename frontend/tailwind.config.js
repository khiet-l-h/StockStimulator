/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#020810",
          900: "#050d1e",
          850: "#080e22",
          800: "#0d1528",
          750: "#111d36",
          700: "#162241",
          600: "#1a2847",
          500: "#213256",
        },
        mint: {
          DEFAULT: "#00e5b0",
          50: "#e8fff9",
          100: "#b8ffee",
          200: "#7afcde",
          300: "#33ecc9",
          400: "#00d4aa",
          500: "#00e5b0",
          600: "#00c49a",
          700: "#009e7c",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.25s ease-out",
        "slide-up": "slideUp 0.28s ease-out",
        "spin-slow": "spin 1.5s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      boxShadow: {
        "glow-mint": "0 0 28px rgba(0,229,176,0.18)",
        "glow-mint-sm": "0 0 12px rgba(0,229,176,0.12)",
        "dark-sm": "0 2px 8px rgba(0,0,0,0.5)",
        dark: "0 4px 24px rgba(0,0,0,0.55)",
        "dark-lg": "0 8px 40px rgba(0,0,0,0.65)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
