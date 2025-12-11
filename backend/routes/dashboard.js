import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { supabase } from '../supabase/client.js';

const router = express.Router();

// GET dashboard stats (requires authentication)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get counts in parallel
    const [
      { count: totalQuotes },
      { count: totalUsers },
      { count: totalFavorites },
      { count: totalLikes },
      { data: recentQuotes }
    ] = await Promise.all([
      supabase.from('quotes').select('*', { count: 'exact', head: true }),
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('user_favorites').select('*', { count: 'exact', head: true }),
      supabase.from('quote_likes').select('*', { count: 'exact', head: true }),
      supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    // Get user's personal stats
    const { count: userFavoritesCount } = await supabase
      .from('user_favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: userQuotesCount } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .eq('submitted_by', userId);

    res.json({
      success: true,
      data: {
        total_quotes: totalQuotes || 0,
        total_users: totalUsers || 0,
        total_favorites: totalFavorites || 0,
        total_likes: totalLikes || 0,
        user_stats: {
          favorites_count: userFavoritesCount || 0,
          submitted_quotes: userQuotesCount || 0
        },
        recent_quotes: recentQuotes || []
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats'
    });
  }
});

// GET trending quotes (most liked)
router.get('/trending', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        quote_likes(count),
        user_profiles!quotes_submitted_by_fkey(username, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    // Sort by like count
    const sortedQuotes = data.map(quote => ({
      ...quote,
      like_count: quote.quote_likes?.[0]?.count || 0
    })).sort((a, b) => b.like_count - a.like_count)
      .slice(0, 10); // Top 10

    res.json({
      success: true,
      data: sortedQuotes
    });

  } catch (error) {
    console.error('Trending quotes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending quotes'
    });
  }
});

export default router;
