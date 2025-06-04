/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        // Palette AI-inspired moderna
        primary: {
          50: '#E6F3FF',
          100: '#CCE7FF',
          200: '#99CFFF',
          300: '#66B7FF',
          400: '#339FFF',
          500: '#0087FF', // Primary principale
          600: '#006BE6',
          700: '#0052B3',
          800: '#003A80',
          900: '#00224D',
        },
        secondary: {
          50: '#F8FAFF',
          100: '#F1F5FF',
          200: '#E3EBFF',
          300: '#D5E1FF',
          400: '#C7D7FF',
          500: '#B9CDFF',
          600: '#94A3D3',
          700: '#6F7AA7',
          800: '#4A517A',
          900: '#25284E',
        },
        accent: {
          50: '#FFF4F1',
          100: '#FFE9E3',
          200: '#FFD3C7',
          300: '#FFBDAB',
          400: '#FFA78F',
          500: '#FF6B35', // Accent principale
          600: '#E6522A',
          700: '#B3401F',
          800: '#802E15',
          900: '#4D1C0A',
        },
        // Nuove palette per AI/Tech
        neon: {
          blue: '#00D4FF',
          purple: '#8B5CF6',
          pink: '#EC4899',
          green: '#10B981',
        },
        cyber: {
          dark: '#0D1117',
          darker: '#010409',
          gray: '#161B22',
          border: '#30363D',
        },
        glass: {
          white: 'rgba(255, 255, 255, 0.1)',
          dark: 'rgba(0, 0, 0, 0.1)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.2' }],
        '6xl': ['3.75rem', { lineHeight: '1.1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      animation: {
        // Animazioni base migliorate
        'fade-up': 'fadeInUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-down': 'fadeInDown 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-left': 'fadeInLeft 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-right': 'fadeInRight 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'scale-up': 'scaleUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        
        // Animazioni AI/Tech
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite alternate',
        'spin-slow': 'spin 20s linear infinite',
        'spin-reverse': 'spinReverse 15s linear infinite',
        'bounce-subtle': 'bounceSubtle 3s ease-in-out infinite',
        
        // Animazioni futuristiche
        'glitch': 'glitch 2s infinite',
        'neon-pulse': 'neonPulse 1.5s ease-in-out infinite alternate',
        'data-flow': 'dataFlow 3s linear infinite',
        'hologram': 'hologram 4s ease-in-out infinite',
        
        // Micro-interazioni
        'hover-lift': 'hoverLift 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'click-shrink': 'clickShrink 0.1s ease-in-out',
        'gradient-shift': 'gradientShift 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        // Animazioni base
        fadeInUp: {
          '0%': { opacity: 0, transform: 'translateY(30px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: 0, transform: 'translateY(-30px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        fadeInLeft: {
          '0%': { opacity: 0, transform: 'translateX(-30px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' },
        },
        fadeInRight: {
          '0%': { opacity: 0, transform: 'translateX(30px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' },
        },
        scaleUp: {
          '0%': { opacity: 0, transform: 'scale(0.8)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        
        // Animazioni AI/Tech
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 135, 255, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 135, 255, 0.8), 0 0 30px rgba(0, 135, 255, 0.4)' },
        },
        spinReverse: {
          '0%': { transform: 'rotate(360deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        
        // Animazioni futuristiche
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
        neonPulse: {
          '0%': { textShadow: '0 0 5px currentColor, 0 0 10px currentColor' },
          '100%': { textShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor' },
        },
        dataFlow: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        hologram: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.8 },
        },
        
        // Micro-interazioni
        hoverLift: {
          '0%': { transform: 'translateY(0) scale(1)' },
          '100%': { transform: 'translateY(-5px) scale(1.02)' },
        },
        clickShrink: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      backgroundImage: {
        // Gradienti moderni
        'gradient-primary': 'linear-gradient(135deg, #0087FF, #00D4FF)',
        'gradient-accent': 'linear-gradient(135deg, #FF6B35, #EC4899)',
        'gradient-cyber': 'linear-gradient(135deg, #0D1117, #161B22)',
        'gradient-neon': 'linear-gradient(135deg, #00D4FF, #8B5CF6, #EC4899)',
        
        // Gradienti per hero
        'hero-gradient': 'linear-gradient(135deg, #ffffff 0%, #f8faff 30%, #e6f3ff 100%)',
        'hero-dark': 'linear-gradient(135deg, #0D1117 0%, #161B22 50%, #21262D 100%)',
        
        // Gradienti glassmorphism
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
        'glass-border': 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1))',
        
        // Pattern AI
        'circuit-pattern': 'radial-gradient(circle at 25% 25%, #00D4FF 2px, transparent 2px), radial-gradient(circle at 75% 75%, #8B5CF6 2px, transparent 2px)',
        'neural-network': 'conic-gradient(from 0deg, #0087FF, #00D4FF, #8B5CF6, #EC4899, #0087FF)',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        '3xl': '40px',
      },
      boxShadow: {
        // Ombre moderne
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'large': '0 20px 40px -4px rgba(0, 0, 0, 0.1), 0 8px 16px -4px rgba(0, 0, 0, 0.06)',
        
        // Ombre glow
        'glow-sm': '0 0 10px rgba(0, 135, 255, 0.3)',
        'glow-md': '0 0 20px rgba(0, 135, 255, 0.4)',
        'glow-lg': '0 0 30px rgba(0, 135, 255, 0.5)',
        'glow-accent': '0 0 20px rgba(255, 107, 53, 0.4)',
        'glow-neon': '0 0 20px rgba(0, 212, 255, 0.6)',
        
        // Ombre glassmorphism
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-lg': '0 15px 35px 0 rgba(31, 38, 135, 0.4)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '3rem',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      }
    },
  },
  plugins: [],
}