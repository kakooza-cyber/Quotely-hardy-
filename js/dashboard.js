class DashboardManager {
    constructor() {
        this.currentQuoteIndex = 0;
        this.quotes = [];
        this.userStats = {
            favorites: 0,
            viewed: 0,
            shared: 0,
            streak: 0
        };
        this.init();
    }

    async init() {
        // Initialize date
        this.updateDate();
        
        // Check authentication
        await this.checkAuth();
        
        // Load initial data
        await this.loadInitialData();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup real-time subscriptions
        this.setupRealtimeSubscriptions();
    }

    async checkAuth() {
        if (!window.supabaseClient.user) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }

    updateDate() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateString = now.toLocaleDateString('en-US', options);
        document.getElementById('currentDate').textContent = dateString;
    }

    async loadInitialData() {
        try {
            // Load daily quote
            await this.loadDailyQuote();
            
            // Load trending quotes
            await this.loadTrendingQuotes();
            
            // Load user stats
            await this.loadUserStats();
            
            // Load categories
            await this.loadCategories();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load data. Please refresh the page.');
        }
    }

    async loadDailyQuote() {
        const result = await window.supabaseClient.getDailyQuote();
        
        if (result.success && result.quote) {
            this.displayDailyQuote(result.quote);
        } else {
            // Fallback to random quote
            const randomResult = await window.supabaseClient.getRandomQuote();
            if (randomResult.success && randomResult.quote) {
                this.displayDailyQuote(randomResult.quote);
            }
        }
    }

    async loadTrendingQuotes() {
        const result = await window.supabaseClient.getQuotes({
            featured: true
        }, 1, 5);
        
        if (result.success) {
            this.displayTrendingQuotes(result.quotes);
        }
    }

    async loadUserStats() {
        const result = await window.supabaseClient.getUserStats();
        
        if (result.success) {
            this.userStats = result.stats;
            this.updateStatsDisplay();
        }
    }

    async loadCategories() {
        const result = await window.supabaseClient.getCategories();
        
        if (result.success && result.categories) {
            this.populateCategoryFilter(result.categories);
        }
    }

    displayDailyQuote(quote) {
        document.getElementById('quoteText').textContent = `"${quote.text}"`;
        document.getElementById('quoteAuthor').textContent = `- ${quote.author}`;
        document.getElementById('quoteCategory').textContent = quote.category;
        
        // Update like count
        const likeCount = document.querySelector('.like-count');
        if (likeCount) {
            likeCount.textContent = quote.likes_count || 0;
        }
        
        // Update favorite state
        const favoriteBtn = document.getElementById('favoriteQuote');
        if (favoriteBtn) {
            if (quote.is_favorited) {
                favoriteBtn.innerHTML = '<i class="fas fa-star"></i> Favorited';
                favoriteBtn.classList.add('active');
            } else {
                favoriteBtn.innerHTML = '<i class="far fa-star"></i> Favorite';
                favoriteBtn.classList.remove('active');
            }
        }
        
        // Update like button state
        const likeBtn = document.getElementById('likeQuote');
        if (likeBtn) {
            const heartIcon = likeBtn.querySelector('i');
            if (quote.is_liked) {
                heartIcon.classList.remove('far');
                heartIcon.classList.add('fas');
                likeBtn.classList.add('active');
            } else {
                heartIcon.classList.remove('fas');
                heartIcon.classList.add('far');
                likeBtn.classList.remove('active');
            }
        }
        
        // Update background if available
        if (quote.background_url) {
            document.querySelector('.quote-background').style.backgroundImage = 
                `url('${quote.background_url}')`;
        }
        
        // Store current quote for interactions
        this.currentQuote = quote;
    }

    displayTrendingQuotes(quotes) {
        const container = document.getElementById('trendingQuotes');
        if (!container) return;
        
        container.innerHTML = '';
        
        quotes.forEach(quote => {
            const quoteElement = document.createElement('div');
            quoteElement.className = 'quote-item trending-item';
            quoteElement.innerHTML = `
                <div class="trending-content">
                    <p class="trending-quote">"${quote.text}"</p>
                    <div class="trending-meta">
                        <span class="trending-author">${quote.author}</span>
                        <div class="trending-stats">
                            <span class="trending-likes">
                                <i class="fas fa-heart"></i> ${quote.likes_count || 0}
                            </span>
                            <span class="trending-favorites">
                                <i class="fas fa-star"></i> ${quote.favorites_count || 0}
                            </span>
                        </div>
                    </div>
                </div>
            `;
            
            // Add click event to view quote
            quoteElement.addEventListener('click', () => {
                this.viewQuoteDetails(quote.id);
            });
            
            container.appendChild(quoteElement);
        });
    }

    updateStatsDisplay() {
        document.getElementById('favoritesCount').textContent = this.userStats.favorites;
        document.getElementById('viewedCount').textContent = this.userStats.viewed;
        document.getElementById('sharedCount').textContent = this.userStats.shared;
        document.getElementById('streakCount').textContent = `${this.userStats.streak} days`;
    }

    populateCategoryFilter(categories) {
        const filterSelect = document.getElementById('categoryFilter');
        if (!filterSelect) return;
        
        filterSelect.innerHTML = '<option value="">All Categories</option>';
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            filterSelect.appendChild(option);
        });
    }

    setupEventListeners() {
        // Navigation buttons
        document.getElementById('prevQuote')?.addEventListener('click', () => {
            this.navigateQuote('prev');
        });
        
        document.getElementById('nextQuote')?.addEventListener('click', () => {
            this.navigateQuote('next');
        });
        
        document.getElementById('newQuote')?.addEventListener('click', () => {
            this.loadRandomQuote();
        });
        
        // Like button
        document.getElementById('likeQuote')?.addEventListener('click', async (e) => {
            await this.handleLike();
        });
        
        // Favorite button
        document.getElementById('favoriteQuote')?.addEventListener('click', async (e) => {
            await this.handleFavorite();
        });
        
        // Share buttons
        document.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const platform = e.currentTarget.dataset.platform;
                this.shareQuote(platform);
            });
        });
        
        // Newsletter subscription
        document.getElementById('subscribeBtn')?.addEventListener('click', async () => {
            await this.handleNewsletterSubscription();
        });
        
        // Mobile navigation
        document.querySelector('.nav-toggle')?.addEventListener('click', () => {
            document.querySelector('.nav-menu').classList.toggle('active');
        });
        
        // Category filter
        document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
            this.filterQuotesByCategory(e.target.value);
        });
        
        // Search functionality
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            this.debouncedSearch(e.target.value);
        });
    }

    setupRealtimeSubscriptions() {
        // Subscribe to quote updates
        window.supabaseClient.subscribeToQuoteUpdates((payload) => {
            console.log('Quote updated:', payload);
            // Refresh quotes if needed
            if (payload.new && payload.new.id === this.currentQuote?.id) {
                this.loadDailyQuote();
            }
        });
        
        // Subscribe to user favorites
        window.supabaseClient.subscribeToUserFavorites((payload) => {
            console.log('Favorite updated:', payload);
            this.loadUserStats();
        });
    }

    async navigateQuote(direction) {
        // Implement quote navigation logic
        // This would require storing a list of quotes
    }

    async loadRandomQuote() {
        const result = await window.supabaseClient.getRandomQuote();
        
        if (result.success && result.quote) {
            this.displayDailyQuote(result.quote);
        }
    }

    async handleLike() {
        if (!this.currentQuote) return;
        
        const result = await window.supabaseClient.toggleLike(this.currentQuote.id);
        
        if (result.success) {
            // Update UI immediately
            const likeBtn = document.getElementById('likeQuote');
            const heartIcon = likeBtn.querySelector('i');
            const likeCount = likeBtn.querySelector('.like-count');
            
            if (result.action === 'liked') {
                heartIcon.classList.remove('far');
                heartIcon.classList.add('fas');
                likeBtn.classList.add('active');
                likeCount.textContent = parseInt(likeCount.textContent) + 1;
                
                // Update user stats
                this.userStats.likes = (this.userStats.likes || 0) + 1;
                this.updateStatsDisplay();
            } else {
                heartIcon.classList.remove('fas');
                heartIcon.classList.add('far');
                likeBtn.classList.remove('active');
                likeCount.textContent = parseInt(likeCount.textContent) - 1;
                
                // Update user stats
                this.userStats.likes = Math.max(0, (this.userStats.likes || 0) - 1);
                this.updateStatsDisplay();
            }
        }
    }

    async handleFavorite() {
        if (!this.currentQuote) return;
        
        const result = await window.supabaseClient.toggleFavorite(this.currentQuote.id);
        
        if (result.success) {
            // Update UI immediately
            const favoriteBtn = document.getElementById('favoriteQuote');
            
            if (result.action === 'favorited') {
                favoriteBtn.innerHTML = '<i class="fas fa-star"></i> Favorited';
                favoriteBtn.classList.add('active');
                
                // Update user stats
                this.userStats.favorites = (this.userStats.favorites || 0) + 1;
                this.updateStatsDisplay();
            } else {
                favoriteBtn.innerHTML = '<i class="far fa-star"></i> Favorite';
                favoriteBtn.classList.remove('active');
                
                // Update user stats
                this.userStats.favorites = Math.max(0, (this.userStats.favorites || 0) - 1);
                this.updateStatsDisplay();
            }
        }
    }

    async handleNewsletterSubscription() {
        const emailInput = document.getElementById('newsletterEmail');
        const email = emailInput.value;
        
        if (!this.validateEmail(email)) {
            this.showError('newsletterEmail', 'Please enter a valid email address');
            return;
        }
        
        const result = await window.supabaseClient.subscribeToNewsletter(email);
        
        if (result.success) {
            this.showSuccess('Successfully subscribed to newsletter!');
            emailInput.value = '';
        } else {
            this.showError('newsletterEmail', result.error || 'Subscription failed');
        }
    }

    async filterQuotesByCategory(category) {
        // This would be implemented in the quotes page
        console.log('Filter by category:', category);
    }

    debouncedSearch = this.debounce(async (query) => {
        if (query.length < 2) return;
        
        const result = await window.supabaseClient.searchQuotes(query);
        
        if (result.success) {
            this.displaySearchResults(result.quotes);
        }
    }, 300);

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    shareQuote(platform) {
        if (!this.currentQuote) return;
        
        const quote = this.currentQuote;
        const text = `"${quote.text}" - ${quote.author}`;
        const url = window.location.href;
        
        let shareUrl;
        
        switch (platform) {
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
                break;
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
                break;
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
                break;
            case 'copy':
                navigator.clipboard.writeText(`${text}\n\n${url}`);
                this.showSuccess('Quote copied to clipboard!');
                
                // Update share count
                this.userStats.shared = (this.userStats.shared || 0) + 1;
                this.updateStatsDisplay();
                return;
        }
        
        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
            
            // Update share count
            this.userStats.shared = (this.userStats.shared || 0) + 1;
            this.updateStatsDisplay();
        }
    }

    viewQuoteDetails(quoteId) {
        // Navigate to quote details page or show modal
        window.location.href = `quote-details.html?id=${quoteId}`;
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    showError(message) {
        // Create error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'notification error';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    showSuccess(message) {
        // Create success notification
        const successDiv = document.createElement('div');
        successDiv.className = 'notification success';
        successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardManager = new DashboardManager();
});
