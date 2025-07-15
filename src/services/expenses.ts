import { supabase } from './supabaseClient'

export interface Expense {
  id: string
  user_id: string
  description: string
  amount: number
  category: string
  date: string
  notes?: string
  receipt_url?: string
  created_at: string
  updated_at: string
}

export interface CreateExpenseData {
  description: string
  amount: number
  category: string
  date: string
  notes?: string
  receipt_url?: string
}

export interface UpdateExpenseData extends Partial<CreateExpenseData> {
  id: string
}

export const EXPENSE_CATEGORIES = [
  'Servicios',
  'Suministros',
  'Transporte',
  'Equipos',
  'Marketing',
  'Alquiler',
  'Servicios Públicos',
  'Seguros',
  'Impuestos',
  'Otros'
] as const

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]

export class ExpenseService {
  static async getAll(): Promise<Expense[]> {
    // Get current user for authentication
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      throw new Error('No authenticated user')
    }

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Error fetching expenses: ${error.message}`)
    }

    return data || []
  }

  static async getById(id: string): Promise<Expense | null> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Error fetching expense: ${error.message}`)
    }

    return data
  }

  static async create(expenseData: CreateExpenseData): Promise<Expense> {
    // Get current user for authentication
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      throw new Error('No authenticated user')
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert([expenseData])
      .select('*')
      .single()

    if (error) {
      throw new Error(`Error creating expense: ${error.message}`)
    }

    return data
  }

  static async update(id: string, expenseData: Partial<CreateExpenseData>): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .update(expenseData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Error updating expense: ${error.message}`)
    }

    return data
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Error deleting expense: ${error.message}`)
    }
  }

  static async getByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('transaction_type', 'expense')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (error) {
      throw new Error(`Error fetching expenses by date range: ${error.message}`)
    }

    return data || []
  }

  static async getByCategory(category: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('transaction_type', 'expense')
      .eq('category', category)
      .order('date', { ascending: false })

    if (error) {
      throw new Error(`Error fetching expenses by category: ${error.message}`)
    }

    return data || []
  }

  static async getMonthlyExpenses(year: number, month: number): Promise<Expense[]> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    return this.getByDateRange(startDate, endDate)
  }

  static async getYearlyExpenses(year: number): Promise<Expense[]> {
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    return this.getByDateRange(startDate, endDate)
  }

  static async getExpenseStats(): Promise<{
    total: number
    totalAmount: number
    averageAmount: number
    categories: Record<string, number>
    monthlyTotals: Record<string, number>
    topCategories: Array<{ category: string; amount: number; count: number }>
  }> {
    try {
      // Intentar usar la vista de estadísticas si existe
      const { data: viewData, error: viewError } = await supabase
        .from('expense_statistics')
        .select('*')
        .single()

      if (!viewError && viewData) {
        // Si la vista existe y funciona, procesarla
        const stats = viewData || {}
        
        // Obtener datos adicionales para categorías y totales mensuales
        const { data: categoryData, error: categoryError } = await supabase
          .from('expenses')
          .select('category, amount, date')
          .eq('transaction_type', 'expense')

        if (categoryError) {
          throw new Error(`Error fetching category data: ${categoryError.message}`)
        }

        const expenses = categoryData || []
        const categories: Record<string, number> = {}
        const monthlyTotals: Record<string, number> = {}
        const categoryStats: Record<string, { amount: number; count: number }> = {}

        expenses.forEach(expense => {
          categories[expense.category] = (categories[expense.category] || 0) + expense.amount
          
          const monthKey = expense.date.substring(0, 7)
          monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + expense.amount
          
          if (!categoryStats[expense.category]) {
            categoryStats[expense.category] = { amount: 0, count: 0 }
          }
          categoryStats[expense.category].amount += expense.amount
          categoryStats[expense.category].count += 1
        })

        const topCategories = Object.entries(categoryStats)
          .map(([category, stats]) => ({ category, ...stats }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5)

        return {
          total: stats.total_expenses || 0,
          totalAmount: stats.total_amount || 0,
          averageAmount: stats.average_expense || 0,
          categories,
          monthlyTotals,
          topCategories
        }
      }
    } catch (error) {
      // Expense statistics view not available, using fallback calculation
    }

    // Fallback: calcular estadísticas directamente desde la tabla expenses
    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .eq('transaction_type', 'expense')

    if (expensesError) {
      throw new Error(`Error fetching expenses: ${expensesError.message}`)
    }

    const expenses = expensesData || []
    const categories: Record<string, number> = {}
    const monthlyTotals: Record<string, number> = {}
    const categoryStats: Record<string, { amount: number; count: number }> = {}

    let totalAmount = 0

    expenses.forEach(expense => {
      totalAmount += expense.amount
      categories[expense.category] = (categories[expense.category] || 0) + expense.amount
      
      const monthKey = expense.date.substring(0, 7)
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + expense.amount
      
      if (!categoryStats[expense.category]) {
        categoryStats[expense.category] = { amount: 0, count: 0 }
      }
      categoryStats[expense.category].amount += expense.amount
      categoryStats[expense.category].count += 1
    })

    const topCategories = Object.entries(categoryStats)
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    return {
      total: expenses.length,
      totalAmount,
      averageAmount: expenses.length > 0 ? totalAmount / expenses.length : 0,
      categories,
      monthlyTotals,
      topCategories
    }
  }

  static async getCurrentMonthExpenses(): Promise<{
    expenses: Expense[]
    total: number
    categories: Record<string, number>
  }> {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    const expenses = await this.getMonthlyExpenses(year, month)
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    
    const categories: Record<string, number> = {}
    expenses.forEach(expense => {
      categories[expense.category] = (categories[expense.category] || 0) + expense.amount
    })

    return {
      expenses,
      total,
      categories
    }
  }

  static async search(query: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .or(`description.ilike.%${query}%,category.ilike.%${query}%,notes.ilike.%${query}%`)
      .order('date', { ascending: false })

    if (error) {
      throw new Error(`Error searching expenses: ${error.message}`)
    }

    return data || []
  }

  static async getRecentExpenses(limit: number = 10): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Error fetching recent expenses: ${error.message}`)
    }

    return data || []
  }

  static getCategories(): ExpenseCategory[] {
    return [...EXPENSE_CATEGORIES]
  }
}
