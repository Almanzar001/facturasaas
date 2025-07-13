import { supabase } from './supabaseClient'

export interface Client {
  id: string
  user_id: string
  name: string
  email?: string
  phone?: string
  identification?: string
  identification_type?: 'CC' | 'NIT' | 'CE' | 'PP'
  address?: string
  city?: string
  created_at: string
  updated_at: string
}

export interface CreateClientData {
  name: string
  email?: string
  phone?: string
  identification?: string
  identification_type?: 'CC' | 'NIT' | 'CE' | 'PP'
  address?: string
  city?: string
}

export interface UpdateClientData extends Partial<CreateClientData> {
  id: string
}

export class ClientService {
  static async getAll(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      throw new Error(`Error fetching clients: ${error.message}`)
    }

    return data || []
  }

  static async getById(id: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Error fetching client: ${error.message}`)
    }

    return data
  }

  static async create(clientData: CreateClientData): Promise<Client> {
    // Crear sin user_id temporalmente
    const { data, error } = await supabase
      .from('clients')
      .insert([clientData])
      .select('*')
      .single()

    if (error) {
      throw new Error(`Error creating client: ${error.message}`)
    }

    return data
  }

  static async update(id: string, clientData: Partial<CreateClientData>): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .update(clientData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Error updating client: ${error.message}`)
    }

    return data
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Error deleting client: ${error.message}`)
    }
  }

  static async search(query: string): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,identification.ilike.%${query}%`)
      .order('name', { ascending: true })

    if (error) {
      throw new Error(`Error searching clients: ${error.message}`)
    }

    return data || []
  }

  static async getClientStats(): Promise<{
    total: number
    withEmail: number
    withPhone: number
    recent: number
  }> {
    const { data, error } = await supabase
      .from('clients')
      .select('id, email, phone, created_at')

    if (error) {
      throw new Error(`Error fetching client stats: ${error.message}`)
    }

    const clients = data || []
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    return {
      total: clients.length,
      withEmail: clients.filter(c => c.email).length,
      withPhone: clients.filter(c => c.phone).length,
      recent: clients.filter(c => new Date(c.created_at) > thirtyDaysAgo).length
    }
  }
}