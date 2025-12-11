import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { DatabaseQueries } from '../supabase/queries.js';

const router = express.Router();

// Get all quotes (public)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {};

    if (req.query.author) filters.author = req.query.author;
    if (req.query.category) filters.category = req.query.category;
    if (req.query.search) filters.search = req.query.search;

    const { data, error, count } = await DatabaseQueries.getQuotes(page, limit, filters);

    if (error) throw error;

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get quotes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quotes',
      message: error.message
    });
  }
});

// Get random quote
router.get('/random', async (req, res) => {
  try {
    const { data, error } = await DatabaseQueries.getRandomQuote();

    if (error) throw error;

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Random quote error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get random quote'
    });
  }
});

// Get quote by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await DatabaseQueries.getQuoteById(id);

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Quote not found'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Get quote error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quote'
    });
  }
});

// Search quotes
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Missing query',
        message: 'Search query is required'
      });
    }

    const { data, error, count } = await DatabaseQueries.getQuotes(page, limit, { search: query });

    if (error) throw error;

    res.json({
      success: true,
      data,
      query,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Search quotes error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
});

// Submit new quote (authenticated)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content, author, category, tags } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Missing content',
        message: 'Quote content is required'
      });
    }

    const quoteData = {
      content,
      author_id: author || null,
      submitted_by: userId,
      categories: category ? [category] : [],
      tags: tags || [],
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('quotes')
      .insert([quoteData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data,
      message: 'Quote submitted for review'
    });

  } catch (error) {
    console.error('Submit quote error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit quote'
    });
  }
});

export default router;
