class DashboardManager {
    constructor() {
        this.currentQuote = null;
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
        
        // Load user info
        this.loadUserInfo();
    }

    async checkAuth() {
        if (!QuotelyAPI.isAuthenticated()) {
            window.location.href = 'index.html';
            return false;
        }
        
        const user = QuotelyAPI.getCurrentUser();
        if (!user) {
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

    loadUserInfo() {
        const user = QuotelyAPI.getCurrentUser();
        if (user) {
            document.getElementById('userName').textContent = user.name || user.email;
            
            // Update avatar if available
            if (user.avatar) {
                document.getElementById('userAvatar').src = user.avatar;
            }
        }
    }

    async loadInitialData() {
        try {
            // Load daily quote (use random for now)
            await this.loadRandomQuote();
            
            // Load user stats
            await this.loadUserStats();
            
            // Load trending quotes
            await this.loadTrendingQuotes();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load data. Please refresh the page.');
        }
    }

    async loadRandomQuote() {
        try {
            const data = await QuotelyAPI.getRandomQuote();
            
            if (data.success && data.data) {
                this.displayDailyQuote(data.data);
                this.currentQuote = data.data;
            } else {
                // Fallback to hardcoded quote
                this.displayFallbackQuote();
            }
        } catch (error) {
            console.error('Error loading random quote:', error);
            this.displayFallbackQuote();
        }
    }

    async loadUserStats() {
        try {
            const data = await QuotelyAPI.getDashboardStats();
            
            if (data.success && data.data) {
                this.updateStatsDisplay(data.data);
            } else {
                // Use default stats
                this.updateStatsDisplay({
                    favorites: 0,
                    quotesViewed: 0,
                    proverbsViewed: 0,
                    streak: 0
                });
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadTrendingQuotes() {
        try {
            const data = await QuotelyAPI.getQuotes(1, 5);
            
            if (data.success && data.data) {
                this.displayTrendingQuotes(data.data);
            }
        } catch (error) {
            console.error('Error loading trending quotes:', error);
        }
    }

    displayDailyQuote(quote) {
        document.getElementById('quoteText').textContent = `"${quote.content}"`;
        document.getElementById('quoteAuthor').textContent = `- ${quote.author || 'Unknown'}`;
        document.getElementById('quoteCategory').textContent = quote.category || 'General';
        
        // Update like button
        const likeBtn = document.getElementById('likeQuote');
        const likeCount = likeBtn.querySelector('.like-count');
        likeCount.textContent = quote.likes_count || 0;
        
        // Update favorite button
        const favoriteBtn = document.getElementById('favoriteQuote');
        if (quote.isFavorite) {
            favoriteBtn.innerHTML = '<i class="fas fa-star"></i> Favorited';
            favoriteBtn.classList.add('active');
        } else {
            favoriteBtn.innerHTML = '<i class="far fa-star"></i> Favorite';
            favoriteBtn.classList.remove('active');
        }
    }

    displayFallbackQuote() {
        const fallbackQuotes = [
            {
                content: "The only way to do great work is to love what you do.",
                author: "Steve Jobs",
                category: "Inspiration"
            },
            {
                content: "Life is what happens when you're busy making other plans.",
                author: "John Lennon",
                category: "Life"
            },
            {
                content: "The future belongs to those who believe in the beauty of their dreams.",
                author: "Eleanor Roosevelt",
                category: "Dreams"
            }
        ];
        
        const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
        this.displayDailyQuote(randomQuote);
    }

    displayTrendingQuotes(quotes) {
        const container = document.getElementById('trendingQuotes');
        if (!container || !quotes.length) return;
        
        container.innerHTML = '';
        
        quotes.forEach(quote => {
            const quoteElement = document.createElement('div');
            quoteElement.className = 'quote-item trending-item';
            quoteElement.innerHTML = `
                <div class="trending-content">
                    <p class="trending-quote">"${quote.content.substring(0, 100)}${quote.content.length > 100 ? '...' : ''}"</p>
                    <div class="trending-meta">
                        <span class="trending-author">${quote.author || 'Unknown'}</span>
                        <div class="trending-stats">
                            <span class="trending-likes">
                                <i class="fas fa-heart"></i> ${quote.likes_count || 0}
                            </span>
                        </div>
                    </div>
                </div>
            `;
            
            // Add click event
            quoteElement.addEventListener('click', () => {
                this.viewQuote(quote.id);
            });
            
            container.appendChild(quoteElement);
        });
    }

    updateStatsDisplay(stats) {
        document.getElementById('favoritesCount').textContent = stats.favoritesCount || stats.favorites || 0;
        document.getElementById('viewedCount').textContent = (stats.quotesViewed || 0) + (stats.proverbsViewed || 0);
        document.getElementById('sharedCount').textContent = stats.shared || 0;
        document.getElementById('streakCount').textContent = `${stats.streak || 0} days`;
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
        document.getElementById('likeQuote')?.addEventListener('click', async () => {
            await this.handleLike();
        });
        
        // Favorite button
        document.getElementById('favoriteQuote')?.addEventListener('click', async () => {
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
        
        // Logout button
        document.getElementById('logoutBtn')?.addEventListener('click', async () => {
            await QuotelyAPI.logout();
            window.location.href = 'index.html';
        });
    }

    async handleLike() {
        if (!this.currentQuote) return;
        
        // Note: Like functionality would need backend implementation
        // For now, just show a message
        this.showSuccess('Like feature coming soon!');
        
        // Temporary UI update
        const likeBtn = document.getElementById('likeQuote');
        const heartIcon = likeBtn.querySelector('i');
        const likeCount = likeBtn.querySelector('.like-count');
        
        if (heartIcon.classList.contains('far')) {
            heartIcon.classList.remove('far');
            heartIcon.classList.add('fas');
            likeCount.textContent = parseInt(likeCount.textContent) + 1;
        } else {
            heartIcon.classList.remove('fas');
            heartIcon.classList.add('far');
            likeCount.textContent = Math.max(0, parseInt(likeCount.textContent) - 1);
        }
    }

    async handleFavorite() {
        if (!this.currentQuote || !this.currentQuote.id) return;
        
        try {
            const favoriteBtn = document.getElementById('favoriteQuote');
            
            if (favoriteBtn.classList.contains('active')) {
                // Remove from favorites
                // Note: We need the favorite ID to remove - this would require backend changes
                this.showSuccess('Remove favorite coming soon!');
                favoriteBtn.innerHTML = '<i class="far fa-star"></i> Favorite';
                favoriteBtn.classList.remove('active');
                
                // Update stats
                const favoritesCount = document.getElementById('favoritesCount');
                favoritesCount.textContent = Math.max(0, parseInt(favoritesCount.textContent) - 1);
            } else {
                // Add to favorites
                await QuotelyAPI.addFavorite(this.currentQuote.id, 'quote');
                this.showSuccess('Added to favorites!');
                favoriteBtn.innerHTML = '<i class="fas fa-star"></i> Favorited';
                favoriteBtn.classList.add('active');
                
                // Update stats
                const favoritesCount = document.getElementById('favoritesCount');
                favoritesCount.textContent = parseInt(favoritesCount.textContent) + 1;
            }
        } catch (error) {
            console.error('Error handling favorite:', error);
            this.showError('Failed to update favorite');
        }
    }

    async handleNewsletterSubscription() {
        const emailInput = document.getElementById('newsletterEmail');
        const email = emailInput.value.trim();
        
        if (!this.validateEmail(email)) {
            this.showError('Please enter a valid email address');
            return;
        }
        
        // Note: Newsletter subscription would need backend implementation
        this.showSuccess(`Subscribed ${email} to newsletter!`);
        emailInput.value = '';
    }

    navigateQuote(direction) {
        // Note: This would require backend support for quote navigation
        this.showInfo(`Quote navigation (${direction}) coming soon!`);
    }

    shareQuote(platform) {
        if (!this.currentQuote) return;
        
        const quote = this.currentQuote;
        const text = `"${quote.content}" - ${quote.author || 'Unknown'}`;
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
            case 'copy':
                navigator.clipboard.writeText(`${text}\n\n${url}`);
                this.showSuccess('Quote copied to clipboard!');
                
                // Update share count
                const sharedCount = document.getElementById('sharedCount');
                sharedCount.textContent = parseInt(sharedCount.textContent) + 1;
                return;
        }
        
        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
            
            // Update share count
            const sharedCount = document.getElementById('sharedCount');
            sharedCount.textContent = parseInt(sharedCount.textContent) + 1;
        }
    }

    viewQuote(quoteId) {
        // Navigate to quotes page or show modal
        // For now, just log
        console.log('View quote:', quoteId);
        this.showInfo('Quote details coming soon!');
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            ${message}
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardManager = new DashboardManager();
});
