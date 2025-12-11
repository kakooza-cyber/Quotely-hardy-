let currentPage = 1;
let isLoading = false;

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    // Load initial proverbs
    await loadProverbs();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup infinite scroll
    setupInfiniteScroll();
});

async function loadProverbs(page = 1, searchQuery = '') {
    if (isLoading) return;
    
    isLoading = true;
    showLoader(true);
    
    try {
        let proverbs;
        
        if (searchQuery) {
            proverbs = await API.proverbs.search(searchQuery);
        } else {
            proverbs = await API.proverbs.getAll(page);
        }
        
        displayProverbs(proverbs);
        currentPage = page;
    } catch (error) {
        console.error('Error loading proverbs:', error);
        showNotification('Failed to load proverbs', 'error');
    } finally {
        isLoading = false;
        showLoader(false);
    }
}

function displayProverbs(proverbs) {
    const proverbsContainer = document.getElementById('proverbsContainer');
    
    if (!proverbs || proverbs.length === 0) {
        if (currentPage === 1) {
            proverbsContainer.innerHTML = `
                <div class="no-results">
                    <h3>No proverbs found</h3>
                    <p>Try searching for something else</p>
                </div>
            `;
        }
        return;
    }
    
    if (currentPage === 1) {
        proverbsContainer.innerHTML = '';
    }
    
    proverbsContainer.innerHTML += proverbs.map(proverb => `
        <div class="proverb-card" data-id="${proverb.id}">
            <div class="proverb-content">
                <p>${proverb.content}</p>
            </div>
            <div class="proverb-meta">
                <span class="proverb-origin">${proverb.origin || 'Unknown Origin'}</span>
                <div class="proverb-actions">
                    <button class="btn-icon favorite-btn" onclick="toggleFavorite('${proverb.id}', 'proverb')">
                        <i class="${proverb.isFavorite ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    <button class="btn-icon share-btn" onclick="shareProverb('${proverb.id}')">
                        <i class="fas fa-share-alt"></i>
                    </button>
                </div>
            </div>
            ${proverb.meaning ? `<div class="proverb-meaning"><strong>Meaning:</strong> ${proverb.meaning}</div>` : ''}
            ${proverb.tags ? `<div class="proverb-tags">${proverb.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : ''}
        </div>
    `).join('');
}

async function toggleFavorite(itemId, type) {
    try {
        const check = await API.favorites.checkFavorite(itemId, type);
        
        if (check.isFavorite) {
            await API.favorites.removeFavorite(check.favoriteId);
            showNotification('Removed from favorites', 'success');
        } else {
            await API.favorites.addFavorite(itemId, type);
            showNotification('Added to favorites!', 'success');
        }
        
        // Update UI
        await loadProverbs(currentPage);
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
            const query = searchInput.value.trim();
            currentPage = 1;
            await loadProverbs(1, query);
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                currentPage = 1;
                await loadProverbs(1, query);
            }
        });
    }
    
    // Random proverb button
    const randomBtn = document.getElementById('randomBtn');
    if (randomBtn) {
        randomBtn.addEventListener('click', async () => {
            try {
                const randomProverb = await API.proverbs.getRandom();
                displayRandomProverb(randomProverb);
            } catch (error) {
                showNotification('Failed to get random proverb', 'error');
            }
        });
    }
}

function displayRandomProverb(proverb) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h3>Random Proverb</h3>
            <div class="proverb-card">
                <div class="proverb-content">
                    <p>${proverb.content}</p>
                </div>
                <div class="proverb-meta">
                    <span class="proverb-origin">${proverb.origin || 'Unknown Origin'}</span>
                </div>
                ${proverb.meaning ? `<div class="proverb-meaning"><strong>Meaning:</strong> ${proverb.meaning}</div>` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function setupInfiniteScroll() {
    window.addEventListener('scroll', async () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
            if (!isLoading) {
                await loadProverbs(currentPage + 1);
            }
        }
    });
}

function showLoader(show) {
    let loader = document.getElementById('loader');
    
    if (!loader && show) {
        loader = document.createElement('div');
        loader.id = 'loader';
        loader.className = 'loader';
        document.body.appendChild(loader);
    }
    
    if (loader) {
        loader.style.display = show ? 'block' : 'none';
    }
}

showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            ${message}
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize proverbs manager
document.addEventListener('DOMContentLoaded', () => {
    window.proverbsManager = new ProverbsManager();
});
