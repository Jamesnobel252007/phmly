/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Theme variables mapping
        phmly: {
          bg: 'var(--bg-main)',
          surface: 'var(--bg-surface)',
          subtle: 'var(--bg-subtle)',
          elevated: 'var(--bg-elevated)',
          text: 'var(--text-main)',
          muted: 'var(--text-muted)',
          border: 'var(--border-divider)',
        },
        // Brand Identity colors
        goldenRush: '#F5A623',
        amberGlow: '#E08E1B',
        // Dark palette
        forestBlack: '#0A100D',
        pineCharcoal: '#141D17',
        forestCream: '#F4F6F4',
        mutedMoss: '#8A9A8F',
        // Light palette
        smokeWhite: '#F5F6F2',
        lightSurface: '#FFFFFF',
        lightSubtle: '#E9EDE7',
        deepForest: '#0A100D',
        mossGrayLight: '#66736A',
        lightDivider: '#DCE2DA',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'display': ['var(--font-display)', { lineHeight: '1.3' }],
        'page-title': ['var(--font-page-title)', { lineHeight: '1.3' }],
        'room-title': ['var(--font-room-title)', { lineHeight: '1.35' }],
        'section': ['var(--font-section)', { lineHeight: '1.35' }],
        'body': ['var(--font-body)', { lineHeight: '1.45' }],
        'secondary': ['var(--font-secondary)', { lineHeight: '1.4' }],
        'metadata': ['var(--font-metadata)', { lineHeight: '1.35' }],
        'caption': ['var(--font-caption)', { lineHeight: '1.35' }],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
