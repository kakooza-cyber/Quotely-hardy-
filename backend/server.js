// backend/server.js
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// CORS configuration - allow your GitHub Pages domain
const allowedOrigins = [
  'https://kakooza-cyber.github.io',
  'https://kakooza-cyber.github.io/quotely-hardy',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'CORS policy blocks this origin';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));

app.use(limiter);
app.use(express.json());

// Initialize Supabase with service key (NEVER exposed to client)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Public endpoints - these use ANON key safely
const supabasePublic = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Quotely-hardy API is running',
    version: '1.0.0'
  });
});

// ========== AUTH ENDPOINTS ==========
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name, username } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    
    // Create user with Supabase Admin
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for demo
      user_metadata: { 
        full_name: name,
        username: username || email.split('@')[0]
      }
    });
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    // Create user profile
    await supabaseAdmin
      .from('profiles')
      .insert({
        id: data.user.id,
        full_name: name,
        username: username || email.split('@')[0],
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4A90E2&color=fff`
      });
    
    // Return user data (without sensitive info)
    res.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.full_name,
        username: data.user.user_metadata.username,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4A90E2&color=fff`
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Login with public client (safe)
    const { data, error } = await supabasePublic.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.full_name,
        avatar: data.user.user_metadata?.avatar_url || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.email)}&background=4A90E2&color=fff`
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== QUOTE ENDPOINTS ==========
app.get('/api/quotes', async (req, res) => {
  try {
    const { category, author, page = 1, limit = 20, search } = req.query;
    
    let query = supabasePublic
      .from('quotes')
      .select('*', { count: 'exact' })
      .eq('approved', true);
    
    // Apply filters
    if (category) query = query.eq('category', category);
    if (author) query = query.ilike('author', `%${author}%`);
    if (search) {
      query = query.or(`text.ilike.%${search}%,author.ilike.%${search}%`);
    }
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    
    if (error) throw error;
    
    res.json({
      success: true,
      quotes: data,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get quotes error:', error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

app.post('/api/quotes/submit', async (req, res) => {
  try {
    const { text, author, category, source, tags, userId } = req.body;
    
    if (!text || !author || !category || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Insert quote with user ID
    const { data, error } = await supabaseAdmin
      .from('quotes')
      .insert({
        text,
        author,
        category,
        source: source || null,
        tags: tags || [],
        created_by: userId,
        approved: false // Goes to moderation queue
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: 'Quote submitted for review',
      quote: data
    });
  } catch (error) {
    console.error('Submit quote error:', error);
    res.status(500).json({ error: 'Failed to submit quote' });
  }
});

// ========== PROVERBS ENDPOINTS ==========
app.get('/api/proverbs', async (req, res) => {
  try {
    const { category, origin, search } = req.query;
    
    let query = supabasePublic.from('proverbs');
    
    if (category) query = query.eq('category', category);
    if (origin) query = query.eq('origin', origin);
    if (search) {
      query = query.or(`text.ilike.%${search}%,origin.ilike.%${search}%`);
    }
    
    const { data, error } = await query
      .select('*')
      .order('likes_count', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      success: true,
      proverbs: data
    });
  } catch (error) {
    console.error('Get proverbs error:', error);
    res.status(500).json({ error: 'Failed to fetch proverbs' });
  }
});

// ========== USER ENDPOINTS ==========
app.get('/api/user/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data, error } = await supabasePublic
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      profile: data
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.put('/api/user/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const profileData = req.body;
    
    // Remove sensitive fields
    delete profileData.id;
    delete profileData.created_at;
    
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(profileData)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      profile: data
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ========== FAVORITES ENDPOINTS ==========
app.post('/api/user/favorites', async (req, res) => {
  try {
    const { userId, quoteId, action } = req.body;
    
    if (!userId || !quoteId) {
      return res.status(400).json({ error: 'User ID and Quote ID are required' });
    }
    
    if (action === 'add') {
      // Add to favorites
      const { data, error } = await supabaseAdmin
        .from('user_favorites')
        .insert({ user_id: userId, quote_id: quoteId })
        .select()
        .single();
      
      if (error) {
        // Might already be favorited
        if (error.code === '23505') {
          return res.json({ success: true, action: 'already_favorited' });
        }
        throw error;
      }
      
      res.json({
        success: true,
        action: 'added',
        favorite: data
      });
    } else if (action === 'remove') {
      // Remove from favorites
      const { error } = await supabaseAdmin
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('quote_id', quoteId);
      
      if (error) throw error;
      
      res.json({
        success: true,
        action: 'removed'
      });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Favorites error:', error);
    res.status(500).json({ error: 'Failed to update favorites' });
  }
});

app.get('/api/user/favorites/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const { data, error, count } = await supabasePublic
      .from('user_favorites')
      .select(`
        *,
        quotes (*)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    
    if (error) throw error;
    
    res.json({
      success: true,
      favorites: data.map(fav => fav.quotes),
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// ========== CONTACT FORM ENDPOINT ==========
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message, userId } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }
    
    // Store contact submission in database
    const { data, error } = await supabaseAdmin
      .from('contact_submissions')
      .insert({
        name,
        email,
        subject: subject || 'General Inquiry',
        message,
        user_id: userId || null
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // In production, you would send an email here
    // For now, just store in database
    
    res.json({
      success: true,
      message: 'Message received successfully',
      submission: data
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to submit contact form' });
  }
});

// ========== NEWSLETTER ENDPOINT ==========
app.post('/api/newsletter/subscribe', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Store in newsletter subscribers
    const { data, error } = await supabaseAdmin
      .from('newsletter_subscribers')
      .insert({
        email,
        name: name || null
      })
      .select()
      .single();
    
    if (error) {
      // Might already be subscribed
      if (error.code === '23505') {
        return res.json({ success: true, message: 'Already subscribed' });
      }
      throw error;
    }
    
    res.json({
      success: true,
      message: 'Successfully subscribed to newsletter',
      subscriber: data
    });
  } catch (error) {
    console.error('Newsletter error:', error);
    res.status(500).json({ error: 'Failed to subscribe to newsletter' });
  }
});

// ========== ERROR HANDLING ==========
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Quotely-hardy API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
