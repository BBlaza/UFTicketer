// Offers will be loaded from backend API
let offers = [];

// DOM Elements
const profileBtn = document.getElementById('profileBtn');
const messagesBtn = document.getElementById('messagesBtn');
const friendsBtn = document.getElementById('friendsBtn');
const authModal = document.getElementById('authModal');
const closeModal = document.getElementById('closeModal');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const offersGrid = document.querySelector('.offers-grid');
const authForm = document.getElementById('authForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submitBtn');
const switchModeBtn = document.getElementById('switchModeBtn');
const modalTitle = document.getElementById('modalTitle');
const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
const forgotPasswordGroup = document.getElementById('forgotPasswordGroup');
const switchModeText = document.getElementById('switchModeText');
const authMessage = document.getElementById('authMessage');

// Auth state
let isLoginMode = true;

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    fetchOffersAndRender();
    checkAuthStatus();
    setupAuthHandlers();
});

async function fetchOffersAndRender() {
    try {
        // Fetch offers from backend API (DB-backed)
        const resp = await fetch('/api/offers/');
        const data = await resp.json();
        // API returns { results: [...] }
        offers = Array.isArray(data.results) ? data.results : [];
    } catch (e) {
        // If API fails, keep offers as empty to avoid stale dummy data
        offers = [];
    }
    displayOffers(offers);
}

// Display offers
function displayOffers(offersData) {
    offersGrid.innerHTML = '';
    
    offersData.forEach(offer => {
        const offerCard = document.createElement('div');
        offerCard.className = 'offer-card';
        // Choose image source if available, otherwise use icon
        let imageHtml = `<i class="fas ${offer.icon}"></i>`;
        try {
            if (offer.image_path) {
                // image_path may be an array or string
                const img = Array.isArray(offer.image_path) ? offer.image_path[0] : offer.image_path;
                if (img) {
                    imageHtml = `<img src="${img}" alt="${offer.title}"/>`;
                }
            }
        } catch (err) {
            imageHtml = `<i class="fas ${offer.icon}"></i>`;
        }

        const sellerName = offer.seller || 'Unknown';
        const dateText = offer.date ? new Date(offer.date).toLocaleString() : '';

        offerCard.innerHTML = `
            <div class="offer-image">${imageHtml}</div>
            <div class="offer-content">
                <div class="offer-genre">${offer.genre || ''}</div>
                <div class="offer-title">${offer.title || 'Untitled'}</div>
                <div class="offer-description">${offer.description || ''}</div>
                <div class="offer-meta">Seller: ${sellerName} ${dateText ? ' • ' + dateText : ''}</div>
                <div class="offer-footer">
                    <div class="offer-price">${offer.price || ''}</div>
                    <button class="view-btn">View Details</button>
                </div>
            </div>
        `;
        
        offerCard.addEventListener('click', () => {
            alert(`You clicked on: ${offer.title}`);
        });
        
        offersGrid.appendChild(offerCard);
    });
}

// Auth modal handlers
profileBtn.addEventListener('click', () => {
    resetAuthForm();
    authModal.style.display = 'block';
});

closeModal.addEventListener('click', () => {
    authModal.style.display = 'none';
    resetAuthForm();
});

window.addEventListener('click', (e) => {
    if (e.target === authModal) {
        authModal.style.display = 'none';
        resetAuthForm();
    }
});

// Messages button handler
messagesBtn.addEventListener('click', () => {
    alert('Messages feature coming soon!');
});

// Friends button handler
friendsBtn.addEventListener('click', () => {
    alert('Friends feature coming soon!');
});

// Search functionality
searchBtn.addEventListener('click', () => {
    performSearch();
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        performSearch();
    }
});

function performSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        displayOffers(offers);
        return;
    }
    
    const filteredOffers = offers.filter(offer => 
        offer.title.toLowerCase().includes(searchTerm) ||
        (offer.genre && offer.genre.toLowerCase().includes(searchTerm)) ||
        offer.description.toLowerCase().includes(searchTerm)
    );
    
    if (filteredOffers.length === 0) {
        offersGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: white; padding: 2rem;">
                <i class="fas fa-search" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p style="font-size: 1.2rem;">No results found for "${searchInput.value}"</p>
            </div>
        `;
    } else {
        displayOffers(filteredOffers);
    }
}

// Auth functions
function setupAuthHandlers() {
    authForm.addEventListener('submit', handleAuthSubmit);
    switchModeBtn.addEventListener('click', toggleAuthMode);
    forgotPasswordBtn.addEventListener('click', handleForgotPassword);
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    updateAuthModeUI();
}

function updateAuthModeUI() {
    if (isLoginMode) {
        modalTitle.textContent = 'Sign In';
        submitBtn.textContent = 'Sign In';
        switchModeText.textContent = "Don't have an account?";
        switchModeBtn.textContent = 'Sign Up';
        forgotPasswordGroup.style.display = 'block';
        passwordInput.setAttribute('autocomplete', 'current-password');
    } else {
        modalTitle.textContent = 'Sign Up';
        submitBtn.textContent = 'Sign Up';
        switchModeText.textContent = 'Already have an account?';
        switchModeBtn.textContent = 'Log In';
        forgotPasswordGroup.style.display = 'none';
        passwordInput.setAttribute('autocomplete', 'new-password');
    }
    clearAuthMessage();
}

function resetAuthForm() {
    isLoginMode = true;
    updateAuthModeUI();
    authForm.reset();
    clearAuthMessage();
}

function clearAuthMessage() {
    authMessage.textContent = '';
    authMessage.className = 'auth-message';
}

function showAuthMessage(message, isError = false) {
    authMessage.textContent = message;
    authMessage.className = isError ? 'auth-message error' : 'auth-message success';
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    clearAuthMessage();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    if (!username || !password) {
        showAuthMessage('Please fill in all fields', true);
        return;
    }
    
    const endpoint = isLoginMode ? '/api/auth/login/' : '/api/auth/signup/';
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include', // Include cookies for session
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAuthMessage(data.message || (isLoginMode ? 'Login successful!' : 'Account created successfully!'), false);
            // Update profile button text
            profileBtn.querySelector('.user-name').textContent = data.username;
            // Close modal after a short delay
            setTimeout(() => {
                authModal.style.display = 'none';
                resetAuthForm();
            }, 1500);
        } else {
            showAuthMessage(data.error || 'An error occurred', true);
        }
    } catch (error) {
        showAuthMessage('Network error. Please try again.', true);
        console.error('Auth error:', error);
    }
}

async function handleForgotPassword() {
    const username = usernameInput.value.trim();
    
    if (!username) {
        showAuthMessage('Please enter your username first', true);
        return;
    }
    
    try {
        const response = await fetch('/api/auth/password-reset/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username }),
            credentials: 'include',
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAuthMessage(data.message, false);
        } else {
            showAuthMessage(data.error || 'An error occurred', true);
        }
    } catch (error) {
        showAuthMessage('Network error. Please try again.', true);
        console.error('Password reset error:', error);
    }
}

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/status/', {
            credentials: 'include',
        });
        const data = await response.json();
        
        if (data.authenticated) {
            profileBtn.querySelector('.user-name').textContent = data.username;
        }
    } catch (error) {
        console.error('Auth status check error:', error);
    }
}

