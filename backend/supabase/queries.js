import { supabase } from './client.js';

export const DatabaseQueries = {
  // User Management
  async getUserByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') return { error };
    return { data };
  },

  async createUser(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    return { data, error };
  },

  async updateUser(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    return { data, error };
  },

  // Quotes
  async getQuotes(page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('quotes')
      .select('*, author:author_id(name)', { count: 'exact' });
    
    // Apply filters
    if (filters.author) {
      query = query.eq('author_id', filters.author);
    }
    
    if (filters.category) {
      query = query.contains('categories', [filters.category]);
    }
    
    if (filters.search) {
      query = query.or(`content.ilike.%${filters.search}%,tags.cs.{${filters.search}}`);
    }
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    return { data, error, count };
  },

  async getQuoteById(id) {
    const { data, error } = await supabase
      .from('quotes')
      .select('*, author:author_id(*)')
      .eq('id', id)
      .single();
    
    return { data, error };
  },

  async getRandomQuote() {
    const { data, error } = await supabase
      .rpc('get_random_quote');
    
    return { data, error };
  },

  // Proverbs
  async getProverbs(page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('proverbs')
      .select('*', { count: 'exact' });
    
    if (filters.origin) {
      query = query.eq('origin', filters.origin);
    }
    
    if (filters.search) {
      query = query.or(`content.ilike.%${filters.search}%,meaning.ilike.%${filters.search}%`);
    }
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    return { data, error, count };
  },

  // Favorites
  async getUserFavorites(userId) {
    const { data, error } = await supabase
      .from('favorites')
      .select('*, quote:quote_id(*), proverb:proverb_id(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    return { data, error };
  },

  async addFavorite(userId, itemId, type) {
    const favoriteData = {
      user_id: userId,
      created_at: new Date().toISOString()
    };
    
    if (type === 'quote') {
      favoriteData.quote_id = itemId;
    } else {
      favoriteData.proverb_id = itemId;
    }
    
    const { data, error } = await supabase
      .from('favorites')
      .insert([favoriteData])
      .select()
      .single();
    
    return { data, error };
  },

  async removeFavorite(favoriteId) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', favoriteId);
    
    return { error };
  },

  async checkFavorite(userId, itemId, type) {
    let query = supabase
      .from('favorites')
      .select('id');
    
    if (type === 'quote') {
      query = query.eq('quote_id', itemId);
    } else {
      query = query.eq('proverb_id', itemId);
    }
    
    const { data, error } = await query
      .eq('user_id', userId)
      .single();
    
    return { data, error };
  },

  // Dashboard Stats
  async getDashboardStats() {
    const [
      quotesCount,
      proverbsCount,
      usersCount,
      favoritesCount
    ] = await Promise.all([
      this.getCount('quotes'),
      this.getCount('proverbs'),
      this.getCount('users'),
      this.getCount('favorites')
    ]);
    
    return {
      quotes: quotesCount,
      proverbs: proverbsCount,
      users: usersCount,
      favorites: favoritesCount
    };
  },

  async getCount(table) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    return error ? 0 : count;
  }
};
