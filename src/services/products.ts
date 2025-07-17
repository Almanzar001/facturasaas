import { supabase } from './supabaseClient'
import { organizationService } from './organizations'

export interface Product {
  id: string
  user_id: string
  organization_id: string
  name: string
  description?: string
  price: number
  category?: string
  unit: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateProductData {
  name: string
  description?: string
  price: number
  category?: string
  unit?: string
  is_active?: boolean
}

export interface UpdateProductData extends Partial<CreateProductData> {
  id: string
}

export class ProductService {
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

  static async getAll(includeInactive: boolean = false): Promise<Product[]> {
    const { filter } = await this.createOrganizationFilter()

    let query = supabase
      .from('products')
      .select('*')
      .or(filter)
      .order('name', { ascending: true })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Error fetching products: ${error.message}`)
    }

    return data || []
  }

  static async getById(id: string): Promise<Product | null> {
    const { filter } = await this.createOrganizationFilter()

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .or(filter)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Error fetching product: ${error.message}`)
    }

    return data
  }

  static async create(productData: CreateProductData): Promise<Product> {
    const { userId, organizationId } = await this.createOrganizationFilter()
    
    if (!organizationId) {
      throw new Error('No organization selected')
    }

    const productToCreate = {
      ...productData,
      user_id: userId,
      organization_id: organizationId,
      unit: productData.unit || 'unidad',
      is_active: productData.is_active !== undefined ? productData.is_active : true
    }

    const { data, error } = await supabase
      .from('products')
      .insert([productToCreate])
      .select('*')
      .single()

    if (error) {
      throw new Error(`Error creating product: ${error.message}`)
    }

    return data
  }

  static async update(id: string, productData: Partial<CreateProductData>): Promise<Product> {
    const { filter } = await this.createOrganizationFilter()

    const { data, error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id)
      .or(filter)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Error updating product: ${error.message}`)
    }

    return data
  }

  static async delete(id: string): Promise<void> {
    const { filter } = await this.createOrganizationFilter()

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .or(filter)

    if (error) {
      throw new Error(`Error deleting product: ${error.message}`)
    }
  }

  static async toggleActive(id: string): Promise<Product> {
    const product = await this.getById(id)
    if (!product) {
      throw new Error('Product not found')
    }

    return this.update(id, { is_active: !product.is_active })
  }

  static async search(query: string): Promise<Product[]> {
    const { filter } = await this.createOrganizationFilter()

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(filter)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      throw new Error(`Error searching products: ${error.message}`)
    }

    return data || []
  }

  static async getByCategory(category: string): Promise<Product[]> {
    const { filter } = await this.createOrganizationFilter()

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(filter)
      .eq('category', category)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      throw new Error(`Error fetching products by category: ${error.message}`)
    }

    return data || []
  }

  static async getCategories(): Promise<string[]> {
    const { filter } = await this.createOrganizationFilter()

    const { data, error } = await supabase
      .from('products')
      .select('category')
      .or(filter)
      .not('category', 'is', null)
      .eq('is_active', true)

    if (error) {
      throw new Error(`Error fetching categories: ${error.message}`)
    }

    const categorySet = new Set(data?.map(p => p.category).filter(Boolean))
    const categories = Array.from(categorySet)
    return categories.sort()
  }

  static async getProductStats(): Promise<{
    total: number
    active: number
    inactive: number
    categories: number
    averagePrice: number
  }> {
    const { data, error } = await supabase
      .from('product_statistics')
      .select('*')
      .single()

    if (error) {
      // Fallback to old method if view doesn't exist
      const { filter } = await this.createOrganizationFilter()
      
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, is_active, price, category')
        .or(filter)

      if (productsError) {
        throw new Error(`Error fetching product stats: ${productsError.message}`)
      }

      const products = productsData || []
      const categories = new Set(products.map(p => p.category).filter(Boolean))
      const activePrices = products.filter(p => p.is_active).map(p => p.price)
      const averagePrice = activePrices.length > 0 
        ? activePrices.reduce((sum, price) => sum + price, 0) / activePrices.length
        : 0

      return {
        total: products.length,
        active: products.filter(p => p.is_active).length,
        inactive: products.filter(p => !p.is_active).length,
        categories: categories.size,
        averagePrice
      }
    }

    return {
      total: data.total_products || 0,
      active: data.active_products || 0,
      inactive: data.inactive_products || 0,
      categories: data.total_categories || 0,
      averagePrice: data.average_price || 0
    }
  }

  static async getMostUsedProducts(limit: number = 10): Promise<Array<{
    product: Product
    timesUsed: number
  }>> {
    const { data, error } = await supabase
      .from('product_statistics')
      .select('*')
      .eq('is_active', true)
      .order('total_quantity', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Error fetching most used products: ${error.message}`)
    }

    return []
  }
}