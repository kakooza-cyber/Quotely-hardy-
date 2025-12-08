const faunadb = require('faunadb');
const q = faunadb.query;

// Initialize FaunaDB client
const client = new faunadb.Client({
    secret: process.env.FAUNADB_SECRET
});

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const data = JSON.parse(event.body);
        const user = context.clientContext?.user;

        switch (data.action) {
            case 'get-daily':
                return await getDailyQuote();
            case 'get-all':
                return await getAllQuotes(data.filters || {});
            case 'search':
                return await searchQuotes(data.query, data.category);
            case 'submit':
                return await submitQuote(data, user);
            default:
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Invalid action' })
                };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

async function getDailyQuote() {
    const today = new Date().toISOString().split('T')[0];
    
    try {
        // Try to get today's quote
        const result = await client.query(
            q.Get(q.Match(q.Index('quotes_by_date'), today))
        );
        
        return {
            statusCode: 200,
            body: JSON.stringify({ quote: result.data })
        };
    } catch (error) {
        // If no quote for today, get a random one
        const randomResult = await client.query(
            q.Get(q.Random(q.Paginate(q.Match(q.Index('all_quotes')))))
        );
        
        return {
            statusCode: 200,
            body: JSON.stringify({ quote: randomResult.data })
        };
    }
}

async function getAllQuotes(filters) {
    try {
        let query = q.Match(q.Index('all_quotes'));
        
        // Apply filters
        if (filters.category) {
            query = q.Match(q.Index('quotes_by_category'), filters.category);
        }
        
        if (filters.author) {
            query = q.Match(q.Index('quotes_by_author'), filters.author);
        }
        
        const result = await client.query(
            q.Paginate(query, { size: filters.limit || 20 })
        );
        
        // Get the actual documents
        const quotes = await Promise.all(
            result.data.map(ref => client.query(q.Get(ref)))
        );
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                quotes: quotes.map(q => q.data),
                total: result.data.length
            })
        };
    } catch (error) {
        throw error;
    }
}

async function searchQuotes(query, category) {
    try {
        // This is a simplified search. For production, consider using Algolia
        let index = q.Index('all_quotes');
        
        if (category) {
            index = q.Index('quotes_by_category');
        }
        
        const result = await client.query(
            q.Paginate(q.Match(index, category || null))
        );
        
        const quotes = await Promise.all(
            result.data.map(ref => client.query(q.Get(ref)))
        );
        
        // Filter by search query
        const filteredQuotes = quotes
            .map(q => q.data)
            .filter(quote => 
                quote.text.toLowerCase().includes(query.toLowerCase()) ||
                quote.author.toLowerCase().includes(query.toLowerCase())
            );
        
        return {
            statusCode: 200,
            body: JSON.stringify({ quotes: filteredQuotes })
        };
    } catch (error) {
        throw error;
    }
}

async function submitQuote(quoteData, user) {
    if (!user) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }
    
    try {
        const quote = {
            ...quoteData,
            userId: user.sub,
            userName: user.user_metadata?.full_name || user.email,
            submittedAt: new Date().toISOString(),
            status: 'pending',
            likes: 0
        };
        
        const result = await client.query(
            q.Create(q.Collection('quotes'), { data: quote })
        );
        
        return {
            statusCode: 201,
            body: JSON.stringify({ 
                success: true, 
                message: 'Quote submitted for review',
                quote: result.data 
            })
        };
    } catch (error) {
        throw error;
    }
        }
