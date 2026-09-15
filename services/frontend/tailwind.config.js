/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        enterprise: {
          bg: "#f8fafc",
          panel: "#ffffff",
          border: "#e2e8f0",
          text: "#0f172a",
          muted: "#64748b",
          primary: "#1d4ed8",
          "primary-hover": "#1e40af",
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
