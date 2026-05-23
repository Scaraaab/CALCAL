/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070710',
          900: '#0a0a13',
          800: '#10101c',
          700: '#181826',
          600: '#222234',
          500: '#2c2c44'
        },
        brand: {
          DEFAULT: '#7c5cff',
          50:  '#f3f0ff',
          100: '#e6e0ff',
          200: '#cdc0ff',
          300: '#a991ff',
          400: '#8c70ff',
          500: '#7c5cff',
          600: '#5c3df0',
          700: '#4a2dc7',
          800: '#3a229c'
        },
        lime: {
          DEFAULT: '#c8ff3d',
          glow: '#d6ff66'
        },
        macro: {
          protein: '#ff6b9d',
          carbs:   '#ffc857',
          fat:     '#5cb8ff',
          water:   '#4fd1ff'
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Inter"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px -8px rgba(0,0,0,0.5)',
        glow: '0 0 24px -4px rgba(124,92,255,0.4)',
        limeGlow: '0 0 32px -6px rgba(200,255,61,0.5)'
      },
      borderRadius: {
        '4xl': '2rem'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.6s linear infinite'
      },
      keyframes: {
        fadeIn:   { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp:  { '0%': { opacity: 0, transform: 'translateY(12px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        pulseSoft:{ '0%,100%': { opacity: 1 }, '50%': { opacity: 0.7 } },
        shimmer:  { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } }
      }
    }
  },
  plugins: []
};
