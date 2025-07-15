const { execSync } = require('child_process')
const fs = require('fs')


// Verificar si existe .env.local
if (!fs.existsSync('.env.local')) {
  
  const envContent = `# Supabase Configuration (PLACEHOLDER - Reemplazar con valores reales)
NEXT_PUBLIC_SUPABASE_URL=https://fubdratmgsjigdeacjqf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1YmRyYXRtZ3NqaWdkZWFjanFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDExNDIsImV4cCI6MjA2Nzc3NzE0Mn0.hdGTkSVlKTTjxX1BOgi83tLMfRAs-2H4Tig1YUIzbKc

# App Configuration
NEXT_PUBLIC_APP_NAME="Factura SaaS"
NEXT_PUBLIC_APP_URL=http://localhost:3000
`
  
  fs.writeFileSync('.env.local', envContent)
}

try {
  execSync('npm run build', { stdio: 'inherit' })
} catch (error) {
  process.exit(1)
}