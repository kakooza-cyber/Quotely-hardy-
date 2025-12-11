class ProverbsManager {
    constructor() {
        this.proverbs = [];
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalProverbs = 0;
        this.filters = {
            category: '',
            origin: '',
            search: ''
        };
        this.userFavorites = new Set();
        this.init();
    }

    async init() {
        // Check authentication
        if (!await this.checkAuth()) return;
        
        // Load user info
        this.loadUserInfo();
        
        // Load initial data
        await this.loadInitialData();
        
        // Setup event listeners
        this.setupEventListeners();
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

    loadUserInfo() {
        const user = QuotelyAPI.getCurrentUser();
        if (user) {
            // Update avatar if available
            const avatar = document.querySelector('.user-avatar');
            if (avatar && user.avatar) {
                avatar.src = user.avatar;
            }
        }
    }

    async loadInitialData() {
        try {
            // Load user favorites
            await this.loadUserFavorites();
            
            // Load proverbs
            await this.loadProverbs();
            
            // Setup daily proverb actions
            this.setupDailyProverbActions();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showNotification('Failed to load data. Please refresh the page.', 'error');
        }
    }

    async loadUserFavorites() {
        try {
            const data = await QuotelyAPI.getFavorites();
            if (data.success && data.data) {
                // Store proverb favorites in a Set for quick lookup
                this.userFavorites = new Set(
                    data.data
                        .filter(fav => fav.item.type === 'proverb')
                        .map(fav => fav.item.id)
                );
            }
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    }

    async loadProverbs() {
        try {
            const container = document.getElementById('proverbsContainer');
            if (!container) return;

            // Show loading
            container.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Loading proverbs...</p>
                </div>
            `;

            // Prepare filters for API
            const apiFilters = {};
            if (this.filters.search) apiFilters.search = this.filters.search;
            if (this.filters.category) apiFilters.category = this.filters.category;
            if (this.filters.origin) apiFilters.origin = this.filters.origin;

            // Get proverbs from secure backend
            const data = await QuotelyAPI.getProverbs(
                this.currentPage,
                this.pageSize,
                apiFilters
            );

            if (data.success && data.data) {
                this.proverbs = data.data;
                this.totalProverbs = data.pagination?.total || data.data.length;
                
                // Display proverbs
                this.displayProverbs(data.data);
                
                // Update pagination
                this.updatePagination(data);
                
                // Update page info
                this.updatePageInfo();
            } else {
                this.showNotification('No proverbs found. Try different filters.', 'info');
                this.displayEmptyState();
            }
        } catch (error) {
            console.error('Error loading proverbs:', error);
            this.showNotification('Failed to load proverbs. Please try again.', 'error');
            this.displayEmptyState();
        }
    }

    displayProverbs(proverbs) {
        const container = document.getElementById('proverbsContainer');
        if (!container || !proverbs || proverbs.length === 0) {
            this.displayEmptyState();
            return;
        }

        container.innerHTML = '';
        
        proverbs.forEach(proverb => {
            const proverbElement = this.createProverbCard(proverb);
            container.appendChild(proverbElement);
        });
    }

    createProverbCard(proverb) {
        const card = document.createElement('div');
        card.className = 'proverb-card';
        
        const isFavorite = this.userFavorites.has(proverb.id);
        
        card.innerHTML = `
            <div class="proverb-content">
                <p class="proverb-text">"${proverb.content}"</p>
                <div class="proverb-meta">
                    <span class="proverb-origin">
                        <i class="fas fa-globe"></i> ${proverb.origin || 'Unknown Origin'}
                    </span>
                    ${proverb.category ? `<span class="proverb-category">${proverb.category}</span>` : ''}
                </div>
                ${proverb.meaning ? `<div class="proverb-meaning"><strong>Meaning:</strong> ${proverb.meaning}</div>` : ''}
                ${proverb.translation ? `<div class="proverb-translation"><strong>Translation:</strong> ${proverb.translation}</div>` : ''}
            </div>
            <div class="proverb-actions">
                <button class="btn-action favorite-btn ${isFavorite ? 'active' : ''}" 
                        data-proverb-id="${proverb.id}" data-action="favorite">
                    <i class="${isFavorite ? 'fas' : 'far'} fa-star"></i>
                </button>
                <button class="btn-action copy-proverb" data-text="${proverb.content}">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="btn-action share-proverb" data-proverb="${JSON.stringify(proverb).replace(/"/g, '&quot;')}">
                    <i class="fas fa-share"></i>
                </button>
            </div>
        `;
        
        // Add event listeners
        this.addProverbEventListeners(card, proverb, isFavorite);
        
        return card;
    }

    addProverbEventListeners(card, proverb, isFavorite) {
        // Favorite button
        const favoriteBtn = card.querySelector('.favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.handleFavorite(proverb.id, favoriteBtn, isFavorite);
            });
        }
        
        // Copy button
        const copyBtn = card.querySelector('.copy-proverb');
        if (copyBtn) {
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.copyProverb(proverb.content);
            });
        }
        
        // Share button
        const shareBtn = card.querySelector('.share-proverb');
        if (shareBtn) {
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.shareProverb(proverb);
            });
        }
    }

    setupEventListeners() {
        // Search
        document.getElementById('searchBtn')?.addEventListener('click', () => {
            this.handleSearch();
        });

        document.getElementById('proverbSearch')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        // Category filter
        document.getElementById('proverbCategoryFilter')?.addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.currentPage = 1;
            this.loadProverbs();
        });
        
        // Origin filter
        document.getElementById('proverbOriginFilter')?.addEventListener('change', (e) => {
            this.filters.origin = e.target.value;
            this.currentPage = 1;
            this.loadProverbs();
        });
        
        // Clear filters
        document.getElementById('clearFilters')?.addEventListener('click', () => {
            this.clearFilters();
        });

        // Pagination
        document.getElementById('prevPage')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadProverbs();
            }
        });

        document.getElementById('nextPage')?.addEventListener('click', () => {
            const totalPages = Math.ceil(this.totalProverbs / this.pageSize);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.loadProverbs();
            }
        });

        // Category cards
        document.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const category = e.currentTarget.dataset.category;
                this.filterByCategory(category);
            });
        });

        // Logout button
        document.getElementById('logoutBtn')?.addEventListener('click', async () => {
            await QuotelyAPI.logout();
            window.location.href = 'index.html';
        });

        // Mobile navigation
        document.querySelector('.nav-toggle')?.addEventListener('click', () => {
            document.querySelector('.nav-menu').classList.toggle('active');
        });
    }

    setupDailyProverbActions() {
        // Copy daily proverb
        document.getElementById('copyDailyProverb')?.addEventListener('click', () => {
            const proverbText = "A journey of a thousand miles begins with a single step.";
            navigator.clipboard.writeText(proverbText);
            this.showNotification('Daily proverb copied to clipboard!', 'success');
        });

        // Share daily proverb
        document.getElementById('shareDailyProverb')?.addEventListener('click', () => {
            const proverb = {
                content: "A journey of a thousand miles begins with a single step.",
                origin: "Chinese Proverb",
                meaning: "Every big accomplishment starts with a small beginning. Don't be afraid to start small."
            };
            this.shareProverb(proverb);
        });
    }

    handleSearch() {
        const searchInput = document.getElementById('proverbSearch');
        if (searchInput) {
            this.filters.search = searchInput.value.trim();
            this.currentPage = 1;
            this.loadProverbs();
        }
    }

    clearFilters() {
        this.filters = {
            category: '',
            origin: '',
            search: ''
        };
        // Reset UI
        const categorySelect = document.getElementById('proverbCategoryFilter');
        const originSelect = document.getElementById('proverbOriginFilter');
        const searchInput = document.getElementById('proverbSearch');

        if (categorySelect) categorySelect.value = '';
        if (originSelect) originSelect.value = '';
        if (searchInput) searchInput.value = '';

        this.currentPage = 1;
        this.loadProverbs();
    }

    async handleFavorite(proverbId, button, isCurrentlyFavorite) {
        try {
            if (isCurrentlyFavorite) {
                // Remove from favorites
                // Note: We need the favorite ID to remove - for now we'll skip removal
                this.showNotification('Remove favorite feature coming soon!', 'info');
                
                // Update UI temporarily
                const icon = button.querySelector('i');
                icon.classList.remove('fas');
                icon.classList.add('far');
                button.classList.remove('active');
                
                // Update favorites set
                this.userFavorites.delete(proverbId);
            } else {
                // Add to favorites
                const data = await QuotelyAPI.addFavorite(proverbId, 'proverb');
                if (data.success) {
                    this.showNotification('Added to favorites!', 'success');
                    
                    // Update UI
                    const icon = button.querySelector('i');
                    icon.classList.remove('far');
                    icon.classList.add('fas');
                    button.classList.add('active');
                    
                    // Update favorites set
                    this.userFavorites.add(proverbId);
                } else {
                    this.showNotification('Failed to add to favorites', 'error');
                }
            }
        } catch (error) {
            console.error('Error handling favorite:', error);
            this.showNotification('Failed to update favorite', 'error');
        }
    }

    filterByCategory(category) {
        this.filters.category = category;
        this.currentPage = 1;
        
        // Update filter select
        const categorySelect = document.getElementById('proverbCategoryFilter');
        if (categorySelect) {
            categorySelect.value = category;
        }
        
        this.loadProverbs();
    }

    copyProverb(text) {
        navigator.clipboard.writeText(text);
        this.showNotification('Proverb copied to clipboard!', 'success');
    }

    shareProverb(proverb) {
        const text = `"${proverb.content}" - ${proverb.origin || 'Proverb'}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Wisdom Proverb',
                text: text,
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(`${text}\n\nShared from Quotely-Hardy`);
            this.showNotification('Proverb copied to clipboard!', 'success');
        }
    }

    updatePagination(data) {
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        
        if (!prevBtn || !nextBtn) return;

        const totalPages = data.pagination?.pages || Math.ceil(this.totalProverbs / this.pageSize);
        
        // Previous button
        prevBtn.disabled = this.currentPage === 1;
        
        // Next button
        nextBtn.disabled = this.currentPage === totalPages;
    }

    updatePageInfo() {
        const pageInfo = document.getElementById('pageInfo');
        if (pageInfo) {
            const totalPages = Math.ceil(this.totalProverbs / this.pageSize);
            pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        }
    }

    displayEmptyState() {
        const container = document.getElementById('proverbsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-globe"></i>
                <h3>No proverbs found</h3>
                <p>Try changing your search or filters</p>
                <button class="btn btn-primary" id="clearAllFilters">Clear All Filters</button>
            </div>
        `;

        // Add event listener to clear filters button
        document.getElementById('clearAllFilters')?.addEventListener('click', () => {
            this.clearFilters();
        });
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    getNotificationIcon(type) {
        switch(type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            default: return 'info-circle';
        }
    }
}

// Initialize proverbs manager
document.addEventListener('DOMContentLoaded', () => {
    window.proverbsManager = new ProverbsManager();
});
