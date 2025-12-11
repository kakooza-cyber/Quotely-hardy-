document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!apiClient.isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    try {
        // Load dashboard data
        await loadDashboardData();
        
        // Load recent activity
        await loadRecentActivity();
        
        // Load recommendations
        await loadRecommendations();
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Failed to load dashboard data', 'error');
    }

    // Event listeners for buttons
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            await loadDashboardData();
            showNotification('Dashboard refreshed', 'success');
        });
    }
});

async function loadDashboardData() {
    try {
        // Get dashboard summary
        const summary = await API.dashboard.getSummary();
        
        // Update UI with summary data
        document.getElementById('totalQuotes').textContent = summary.totalQuotes || 0;
        document.getElementById('totalProverbs').textContent = summary.totalProverbs || 0;
        document.getElementById('favoritesCount').textContent = summary.favoritesCount || 0;
        document.getElementById('todayViews').textContent = summary.todayViews || 0;
        
        // Update welcome message
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.name) {
            document.getElementById('userName').textContent = user.name;
        }
        
    } catch (error) {
        throw error;
    }
}

async function loadRecentActivity() {
    try {
        const activity = await API.dashboard.getRecentActivity();
        const activityList = document.getElementById('recentActivity');
        
        if (!activityList || !activity.length) return;
        
        activityList.innerHTML = activity.map(item => `
            <li class="activity-item">
                <span class="activity-type">${item.type}</span>
                <span class="activity-text">${item.text}</span>
                <span class="activity-time">${formatTime(item.createdAt)}</span>
            </li>
        `).join('');
    } catch (error) {
        console.error('Error loading activity:', error);
    }
}

async function loadRecommendations() {
    try {
        const recommendations = await API.dashboard.getRecommendations();
        const recommendationsList = document.getElementById('recommendations');
        
        if (!recommendationsList || !recommendations.length) return;
        
        recommendationsList.innerHTML = recommendations.map(rec => `
            <div class="recommendation-card">
                <h4>${rec.title}</h4>
                <p>${rec.content}</p>
                <small>${rec.author || 'Unknown'}</small>
                <button class="btn-small" onclick="addToFavorites('${rec.id}', '${rec.type}')">
                    Add to Favorites
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading recommendations:', error);
    }
}

async function addToFavorites(itemId, type) {
    try {
        await API.favorites.addFavorite(itemId, type);
        showNotification('Added to favorites!', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function showNotification(message, type) {
    // Your  notification code
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
                                                     }
