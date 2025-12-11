let currentPage = 1;
let isLoading = false;

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    // Load initial quotes
    await loadQuotes();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup infinite scroll
    setupInfiniteScroll();
});

async function loadQuotes(page = 1, searchQuery = '') {
    if (isLoading) return;
    
    isLoading = true;
    showLoader(true);
    
    try {
        let quotes;
        
        if (searchQuery) {
            quotes = await API.quotes.search(searchQuery);
        } else {
            quotes = await API.quotes.getAll(page);
        }
        
        displayQuotes(quotes);
        currentPage = page;
    } catch (error) {
        console.error('Error loading quotes:', error);
        showNotification('Failed to load quotes', 'error');
    } finally {
        isLoading = false;
        showLoader(false);
    }
}

function displayQuotes(quotes) {
    const quotesContainer = document.getElementById('quotesContainer');
    
    if (!quotes || quotes.length === 0) {
        if (currentPage === 1) {
            quotesContainer.innerHTML = `
                <div class="no-results">
                    <h3>No quotes found</h3>
                    <p>Try searching for something else</p>
                </div>
            `;
        }
        return;
    }
    
    if (currentPage === 1) {
        quotesContainer.innerHTML = '';
    }
    
    quotesContainer.innerHTML += quotes.map(quote => `
        <div class="quote-card" data-id="${quote.id}">
            <div class="quote-content">
                <p>"${quote.content}"</p>
            </div>
            <div class="quote-meta">
                <span class="quote-author">${quote.author || 'Unknown'}</span>
                <div class="quote-actions">
                    <button class="btn-icon favorite-btn" onclick="toggleFavorite('${quote.id}', 'quote')">
                        <i class="${quote.isFavorite ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    <button class="btn-icon share-btn" onclick="shareQuote('${quote.id}')">
                        <i class="fas fa-share-alt"></i>
                    </button>
                </div>
            </div>
            ${quote.tags ? `<div class="quote-tags">${quote.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : ''}
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
        await loadQuotes(currentPage);
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
            await loadQuotes(1, query);
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                currentPage = 1;
                await loadQuotes(1, query);
            }
        });
    }
    
    // Random quote button
    const randomBtn = document.getElementById('randomBtn');
    if (randomBtn) {
        randomBtn.addEventListener('click', async () => {
            try {
                const randomQuote = await API.quotes.getRandom();
                displayRandomQuote(randomQuote);
            } catch (error) {
                showNotification('Failed to get random quote', 'error');
            }
        });
    }
}

function displayRandomQuote(quote) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h3>Random Quote</h3>
            <div class="quote-card">
                <div class="quote-content">
                    <p>"${quote.content}"</p>
                </div>
                <div class="quote-meta">
                    <span class="quote-author">${quote.author || 'Unknown'}</span>
                </div>
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
                await loadQuotes(currentPage + 1);
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

function showNotification(message, type) {
    // Your existing notification code
              }
