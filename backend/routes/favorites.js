import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { supabase } from '../supabase/client.js';

const router = express.Router();

// All favorites routes require authentication
router.use(authenticateToken);

// GET user's favorites
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Get user's favorites with quote details
    const { data, error, count } = await supabase
      .from('user_favorites')
      .select(`
        *,
        quotes:quote_id(*)
      `)
      .eq('user_id', userId)
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Get total count
    const { count: totalCount } = await supabase
      .from('user_favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch favorites'
    });
  }
});

// ADD to favorites
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { quote_id } = req.body;

    if (!quote_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing quote_id',
        message: 'Quote ID is required'
      });
    }

    // Check if already favorited
    const { data: existing } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', userId)
      .eq('quote_id', quote_id)
      .single();

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Already favorited',
        message: 'This quote is already in your favorites'
      });
    }

    const { data, error } = await supabase
      .from('user_favorites')
      .insert([{
        user_id: userId,
        quote_id,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data,
      message: 'Added to favorites'
    });

  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add favorite'
    });
  }
});

// REMOVE from favorites
router.delete('/:quoteId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { quoteId } = req.params;

    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('quote_id', quoteId);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Removed from favorites'
    });

  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove favorite'
    });
  }
});

// CHECK if quote is favorited
router.get('/check/:quoteId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { quoteId } = req.params;

    const { data, error } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', userId)
      .eq('quote_id', quoteId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json({
      success: true,
      is_favorited: !!data
    });

  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check favorite status'
    });
  }
});

export default router;
