// Initialize API client
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    if (apiClient.isAuthenticated()) {
        redirectToDashboard();
    }

    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await API.auth.login(email, password);
                
                // Store token
                apiClient.setToken(response.token);
                
                // Store user info
                localStorage.setItem('user', JSON.stringify(response.user));
                
                // Show success message
                showNotification('Login successful!', 'success');
                
                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            } catch (error) {
                showNotification(error.message, 'error');
            }
        });
    }

    // Register form submission
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
                showNotification('Passwords do not match', 'error');
                return;
            }
            
            try {
                const response = await API.auth.register({
                    name,
                    email,
                    password
                });
                
                // Store token
                apiClient.setToken(response.token);
                
                // Store user info
                localStorage.setItem('user', JSON.stringify(response.user));
                
                // Show success message
                showNotification('Registration successful!', 'success');
                
                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            } catch (error) {
                showNotification(error.message, 'error');
            }
        });
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            try {
                await API.auth.logout();
            } catch (error) {
                console.error('Logout error:', error);
            } finally {
                // Clear local storage
                apiClient.clearToken();
                localStorage.removeItem('user');
                
                // Redirect to login
                window.location.href = 'index.html';
            }
        });
    }
});

function redirectToDashboard() {
    if (!window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'dashboard.html';
    }
}

function showNotification(message, type) {
    // Your existing notification code
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
        }
