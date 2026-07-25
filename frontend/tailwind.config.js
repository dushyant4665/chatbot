
export default {
  content: [
    "./index.html",
    "./src*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        grok: {
          bg: '#0a0a0a',
          card: '#111111',
          border: '#1a1a1a',
          accent: '#1a8cd8',
          text: '#e8e8e8',
          muted: '#888888',
        }
      }
    },
  },
  plugins: [],
}