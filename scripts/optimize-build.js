const { execSync } = require('child_process')
const fs = require('fs')


try {
  execSync('rm -rf .next out dist node_modules/.cache', { stdio: 'inherit' })
} catch (e) {
}

const requiredEnvs = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
]

requiredEnvs.forEach(env => {
  if (!process.env[env]) {
    process.exit(1)
  }
})

process.env.NODE_ENV = 'production'
process.env.NEXT_TELEMETRY_DISABLED = '1'

try {
  execSync('next build', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=4096'
    }
  })
  
  
  if (process.argv.includes('--analyze')) {
    execSync('npx @next/bundle-analyzer', { stdio: 'inherit' })
  }
  
} catch (error) {
  process.exit(1)
}

