import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cache simple en memoria
const cache = new Map<string, { data: any; timestamp: number }>()

export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  cacheTime: number = 5 * 60 * 1000 // 5 minutos por defecto
): Promise<T> {
  const now = Date.now()
  const cached = cache.get(key)

  // Si existe en cache y no ha expirado, devolver datos cacheados
  if (cached && (now - cached.timestamp) < cacheTime) {
    return cached.data
  }

  // Ejecutar query y cachear resultado
  try {
    const data = await queryFn()
    cache.set(key, { data, timestamp: now })
    return data
  } catch (error) {
    // Si hay error y tenemos datos cacheados (aunque expirados), usarlos
    if (cached) {
      return cached.data
    }
    throw error
  }
}

// Función para limpiar cache
export function clearCache(key?: string) {
  if (key) {
    cache.delete(key)
  } else {
    cache.clear()
  }
}

// Función para obtener estadísticas del cache
export function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  }
}
