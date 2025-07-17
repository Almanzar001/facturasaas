import { supabase } from './supabaseClient'
import { organizationService } from './organizations'

export interface Client {
  id: string
  user_id: string
  organization_id: string
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
  // Utility function to create the proper filter for organization/user
  private static async createOrganizationFilter() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      throw new Error('No authenticated user')
    }

    const organizationId = await organizationService.getCurrentOrganizationId()
    if (!organizationId) {
      // If no organization, just filter by user_id
      return { filter: `user_id.eq.${userData.user.id}`, userId: userData.user.id, organizationId: null }
    }

    // Filter by organization_id or (organization_id is null AND user_id matches)
    return { 
      filter: `organization_id.eq.${organizationId},and(organization_id.is.null,user_id.eq.${userData.user.id})`,
      userId: userData.user.id,
      organizationId
    }
  }
  static async getAll(): Promise<Client[]> {
    const { filter } = await this.createOrganizationFilter()
    
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .or(filter)
      .order('name', { ascending: true })

    if (error) {
      throw new Error(`Error fetching clients: ${error.message}`)
    }

    return data || []
  }

  static async getById(id: string): Promise<Client | null> {
    const { filter } = await this.createOrganizationFilter()
    
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .or(filter)
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
    // Get current user for authentication
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      throw new Error('No authenticated user')
    }

    // Get current organization ID
    const organizationId = await organizationService.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('No organization selected')
    }

    const { data, error } = await supabase
      .from('clients')
      .insert([{
        ...clientData,
        user_id: userData.user.id,
        organization_id: organizationId
      }])
      .select('*')
      .single()

    if (error) {
      throw new Error(`Error creating client: ${error.message}`)
    }

    return data
  }

  static async update(id: string, clientData: Partial<CreateClientData>): Promise<Client> {
    const { filter } = await this.createOrganizationFilter()
    
    const { data, error } = await supabase
      .from('clients')
      .update(clientData)
      .eq('id', id)
      .or(filter)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Error updating client: ${error.message}`)
    }

    return data
  }

  static async delete(id: string): Promise<void> {
    const { filter } = await this.createOrganizationFilter()
    
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .or(filter)

    if (error) {
      throw new Error(`Error deleting client: ${error.message}`)
    }
  }

  static async search(query: string): Promise<Client[]> {
    const { filter } = await this.createOrganizationFilter()
    
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .or(filter)
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
    const { filter } = await this.createOrganizationFilter()
    
    const { data, error } = await supabase
      .from('clients')
      .select('id, email, phone, created_at')
      .or(filter)

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