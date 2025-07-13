/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración de TypeScript y ESLint
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Optimizaciones de performance (swcMinify es por defecto en Next.js 15)
  
  // Configuración de imágenes
  images: {
    domains: ['fubdratmgsjigdeacjqf.supabase.co'], // Supabase storage
    formats: ['image/webp', 'image/avif'],
  },
  
  // Optimizaciones experimentales
  experimental: {
    optimizePackageImports: [
      '@heroicons/react',
      'lucide-react',
    ],
  },
  
  // Configuración de compilación
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Configuración de headers para cache
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig