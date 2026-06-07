module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        peter: {
          black: "#080808",
          navy: "#0A0F1E",
          navy2: "#141B2D",
          gold: "#C9A84C",
          goldLight: "#E8D5A3",
          goldDark: "#8B6914",
          silver: "#C0C0C0",
          ivory: "#F5F5F0",
          dim: "#888880",
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', "serif"],
        body: ['"Montserrat"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      boxShadow: {
        gold: "0 0 24px rgba(201,168,76,0.18)",
        goldStrong: "0 0 32px rgba(201,168,76,0.35)",
      },
    },
  },
  plugins: [],
};
