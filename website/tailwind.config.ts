import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#132238',
        cloud: '#f6f8fb',
        mint: '#1f9d8a',
        saffron: '#f4b23c',
      },
      boxShadow: {
        panel: '0 24px 70px rgba(19, 34, 56, 0.12)',
      },
    },
  },
  plugins: [],
} satisfies Config
