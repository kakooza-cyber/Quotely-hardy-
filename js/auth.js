class AuthManager {
    constructor() {
        this.init();
    }

    async init() {
        // Wait for Supabase client to be ready
        if (!window.supabaseClient || !window.supabaseClient.supabase) {
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (window.supabaseClient && window.supabaseClient.supabase) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });
        }

        this.supabase = window.supabaseClient.supabase;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleLogin(e));
        
        // Signup form
        document.getElementById('signupForm')?.addEventListener('submit', (e) => this.handleSignup(e));
        
        // Reset password form
        document.getElementById('resetForm')?.addEventListener('submit', (e) => this.handleResetPassword(e));
        
        // Social login buttons
        document.getElementById('googleLogin')?.addEventListener('click', () => this.socialLogin('google'));
        document.getElementById('facebookLogin')?.addEventListener('click', () => this.socialLogin('facebook'));
        document.getElementById('githubLogin')?.addEventListener('click', () => this.socialLogin('github'));
        
        // Form toggles
        document.getElementById('showSignup')?.addEventListener('click', (e) => this.toggleForm('signup'));
        document.getElementById('showLogin')?.addEventListener('click', (e) => this.toggleForm('login'));
        document.getElementById('forgotPassword')?.addEventListener('click', (e) => this.toggleForm('reset'));
        document.getElementById('showLoginFromReset')?.addEventListener('click', (e) => this.toggleForm('login'));
        
        // Password visibility toggles
        document.getElementById('togglePassword')?.addEventListener('click', () => this.togglePassword('password'));
        document.getElementById('toggleSignupPassword')?.addEventListener('click', () => this.togglePassword('signupPassword'));
        
        // Logout button
        document.getElementById('logoutBtn')?.addEventListener('click', (e) => this.handleLogout(e));
    }

    toggleForm(formType) {
        event.preventDefault();
        
        const forms = ['login', 'signup', 'reset'];
        forms.forEach(type => {
            const form = document.getElementById(`${type}Form`);
            if (form) {
                form.style.display = type === formType ? 'block' : 'none';
            }
        });
    }

    togglePassword(fieldId) {
        const field = document.getElementById(fieldId);
        const icon = document.getElementById(`toggle${fieldId.charAt(0).toUpperCase() + fieldId.slice(1)}`);
        
        if (field.type === 'password') {
            field.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            field.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Validate
        if (!this.validateEmail(email)) {
            this.showError('email', 'Please enter a valid email address');
            return;
        }
        
        if (password.length < 6) {
            this.showError('password', 'Password must be at least 6 characters');
            return;
        }
        
        // Show loading state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        submitBtn.disabled = true;
        
        try {
            const result = await window.supabaseClient.signIn(email, password);
            
            if (result.success) {
                this.showSuccess('Login successful! Redirecting...');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            } else {
                this.showError('password', result.error || 'Invalid credentials');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        } catch (error) {
            this.showError('password', 'An error occurred. Please try again.');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async handleSignup(event) {
        event.preventDefault();
        
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validate
        if (!name.trim()) {
            this.showError('signupName', 'Name is required');
            return;
        }
        
        if (!this.validateEmail(email)) {
            this.showError('signupEmail', 'Please enter a valid email address');
            return;
        }
        
        if (password.length < 6) {
            this.showError('signupPassword', 'Password must be at least 6 characters');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showError('confirmPassword', 'Passwords do not match');
            return;
        }
        
        // Show loading state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
        submitBtn.disabled = true;
        
        try {
            const result = await window.supabaseClient.signUp(email, password, {
                name: name,
                username: email.split('@')[0]
            });
            
            if (result.success) {
                this.showSuccess('Account created successfully! Please check your email to confirm your account.');
                this.toggleForm('login');
            } else {
                this.showError('signupEmail', result.error || 'Signup failed');
            }
        } catch (error) {
            this.showError('signupEmail', 'An error occurred. Please try again.');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async handleResetPassword(event) {
        event.preventDefault();
        
        const email = document.getElementById('resetEmail').value;
        
        if (!this.validateEmail(email)) {
            this.showError('resetEmail', 'Please enter a valid email address');
            return;
        }
        
        // Show loading state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending reset link...';
        submitBtn.disabled = true;
        
        try {
            const result = await window.supabaseClient.resetPassword(email);
            
            if (result.success) {
                this.showSuccess('Password reset link sent to your email!');
                setTimeout(() => {
                    this.toggleForm('login');
                }, 2000);
            } else {
                this.showError('resetEmail', result.error || 'Reset failed');
            }
        } catch (error) {
            this.showError('resetEmail', 'An error occurred. Please try again.');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async socialLogin(provider) {
        try {
            const result = await window.supabaseClient.signInWithProvider(provider);
            
            if (!result.success) {
                this.showError('social', `Failed to login with ${provider}`);
            }
        } catch (error) {
            this.showError('social', `Failed to login with ${provider}`);
        }
    }

    async handleLogout(event) {
        event.preventDefault();
        
        const result = await window.supabaseClient.signOut();
        
        if (result.success) {
            window.location.href = 'index.html';
        } else {
            alert('Logout failed. Please try again.');
        }
    }

    // Helper methods
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    showError(fieldId, message) {
        // Remove existing error
        const existingError = document.querySelector(`#${fieldId} + .error-message`);
        if (existingError) existingError.remove
          // Add error class to field
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.add('error');
            
            // Create error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = message;
            
            field.parentNode.appendChild(errorDiv);
            
            // Remove error after 5 seconds
            setTimeout(() => {
                field.classList.remove('error');
                if (errorDiv.parentNode) {
                    errorDiv.remove();
                }
            }, 5000);
        } else {
            // Show generic error alert
            alert(message);
        }
    }

    showSuccess(message) {
        // Remove existing success message
        const existingSuccess = document.querySelector('.success-message');
        if (existingSuccess) existingSuccess.remove();
        
        // Create success message
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        
        const form = document.querySelector('.auth-form');
        if (form) {
            form.parentNode.insertBefore(successDiv, form);
            
            // Remove after 5 seconds
            setTimeout(() => {
                if (successDiv.parentNode) {
                    successDiv.remove();
                }
            }, 5000);
        } else {
            alert(message);
        }
    }
}

// Initialize auth manager
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});
