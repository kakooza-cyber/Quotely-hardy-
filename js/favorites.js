document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    // Load favorites
    await loadFavorites();
    
    // Setup filter buttons
    setupFilters();
});

async function loadFavorites(type = 'all') {
    try {
        const favorites = await API.favorites.getAll();
        
        // Filter by type if specified
        let filteredFavorites = favorites;
        if (type !== 'all') {
            filteredFavorites = favorites.filter(fav => fav.type === type);
        }
        
        displayFavorites(filteredFavorites);
        
        // Update counts
        updateFavoriteCounts(favorites);
    } catch (error) {
        console.error('Error loading favorites:', error);
        showNotification('Failed to load favorites', 'error');
    }
}

function displayFavorites(favorites) {
    const favoritesContainer = document.getElementById('favoritesContainer');
    
    if (!favorites || favorites.length === 0) {
        favoritesContainer.innerHTML = `
            <div class="no-results">
                <h3>No favorites yet</h3>
                <p>Start adding quotes and proverbs to your favorites!</p>
            </div>
        `;
        return;
    }
    
    favoritesContainer.innerHTML = favorites.map(fav => `
        <div class="favorite-item" data-id="${fav.id}" data-type="${fav.item.type}">
            <div class="favorite-content">
                ${fav.item.type === 'quote' 
                    ? `<p class="quote">"${fav.item.content}"</p>
                       <p class="author">- ${fav.item.author || 'Unknown'}</p>`
                    : `<p class="proverb">${fav.item.content}</p>
                       <p class="origin">Origin: ${fav.item.origin || 'Unknown'}</p>`
                }
            </div>
            <div class="favorite-actions">
                <button class="btn-icon remove-btn" onclick="removeFavorite('${fav.id}')">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="btn-icon share-btn" onclick="shareFavorite('${fav.id}')">
                    <i class="fas fa-share-alt"></i>
                </button>
                <span class="favorite-date">${formatDate(fav.createdAt)}</span>
            </div>
        </div>
    `).join('');
}

function updateFavoriteCounts(favorites) {
    const quoteCount = favorites.filter(fav => fav.item.type === 'quote').length;
    const proverbCount = favorites.filter(fav => fav.item.type === 'proverb').length;
    const totalCount = favorites.length;
    
    document.getElementById('totalFavorites').textContent = totalCount;
    document.getElementById('quoteFavorites').textContent = quoteCount;
    document.getElementById('proverbFavorites').textContent = proverbCount;
}

async function removeFavorite(favoriteId) {
    if (!confirm('Are you sure you want to remove this favorite?')) {
        return;
    }
    
    try {
        await API.favorites.removeFavorite(favoriteId);
        
        // Remove from UI
        const item = document.querySelector(`.favorite-item[data-id="${favoriteId}"]`);
        if (item) {
            item.remove();
        }
        
        showNotification('Removed from favorites', 'success');
        
        // Reload to update counts
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
        await loadFavorites(activeFilter);
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function setupFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Load favorites with filter
            const filterType = this.dataset.filter;
            await loadFavorites(filterType);
        });
    });
}

function shareFavorite(favoriteId) {
    const item = document.querySelector(`.favorite-item[data-id="${favoriteId}"]`);
    const content = item.querySelector('.quote, .proverb').textContent;
    const author = item.querySelector('.author, .origin')?.textContent || '';
    
    const shareText = `${content} ${author}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'My Favorite',
            text: shareText,
        });
    } else {
        navigator.clipboard.writeText(shareText);
        showNotification('Copied to clipboard!', 'success');
    }
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
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
            <button class="notification-close">&times;</button>
        `;

        document.body.appendChild(notification);

        // Add close button functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        switch(type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }
}

// Initialize favorites manager
document.addEventListener('DOMContentLoaded', () => {
    window.favoritesManager = new FavoritesManager
