// Profile page functionality
let isAuthenticated = false;
let myOffers = [];

// DOM Elements
const profileBtn = document.getElementById('profileBtn');
const profileDropdown = document.getElementById('profileDropdown');
const myProfileBtn = document.getElementById('myProfileBtn');
const messagesBtn = document.getElementById('messagesBtn');
const settingsBtn = document.getElementById('settingsBtn');
const logoutBtn = document.getElementById('logoutBtn');
const profileUsername = document.getElementById('profileUsername');
const changePasswordBtn = document.getElementById('changePasswordBtn');
const myOffersGrid = document.getElementById('myOffersGrid');
const myOffersLoading = document.getElementById('myOffersLoading');
const myOffersEmpty = document.getElementById('myOffersEmpty');
const editOfferModal = document.getElementById('editOfferModal');
const closeEditOfferModal = document.getElementById('closeEditOfferModal');
const editOfferForm = document.getElementById('editOfferForm');
const changePasswordModal = document.getElementById('changePasswordModal');
const closeChangePasswordModal = document.getElementById('closeChangePasswordModal');
const changePasswordForm = document.getElementById('changePasswordForm');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupHandlers();
    if (isAuthenticated) {
        loadProfileInfo();
        loadMyOffers();
    }
});

// Check authentication status
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/status/', {
            credentials: 'include',
        });
        const data = await response.json();
        
        if (data.authenticated) {
            isAuthenticated = true;
            if (profileBtn) {
                profileBtn.querySelector('.user-name').textContent = data.username;
            }
            loadProfileInfo();
            loadMyOffers();
        } else {
            isAuthenticated = false;
            if (profileBtn) {
                profileBtn.querySelector('.user-name').textContent = 'Sign in';
            }
            // Redirect to home if not authenticated
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Auth status check error:', error);
        isAuthenticated = false;
        window.location.href = '/';
    }
}

// Load profile information
async function loadProfileInfo() {
    try {
        const response = await fetch('/api/user/profile/', {
            credentials: 'include',
        });
        const data = await response.json();
        
        if (data.success && profileUsername) {
            profileUsername.textContent = data.username || 'Not set';
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Load user's offers
async function loadMyOffers() {
    if (!isAuthenticated) return;
    
    try {
        myOffersLoading.style.display = 'block';
        myOffersEmpty.style.display = 'none';
        myOffersGrid.innerHTML = '';
        
        const response = await fetch('/api/offers/my/', {
            credentials: 'include',
        });
        const data = await response.json();
        
        myOffersLoading.style.display = 'none';
        
        if (data.success && data.results && data.results.length > 0) {
            myOffers = data.results;
            displayMyOffers(data.results);
        } else {
            myOffersEmpty.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading offers:', error);
        myOffersLoading.style.display = 'none';
        myOffersEmpty.style.display = 'block';
        myOffersEmpty.innerHTML = '<p>Failed to load your offers. Please try again.</p>';
    }
}

// Display user's offers
function displayMyOffers(offers) {
    myOffersGrid.innerHTML = '';
    
    offers.forEach(offer => {
        const offerCard = document.createElement('div');
        offerCard.className = 'offer-card';
        offerCard.dataset.offerId = offer.id;
        
        let imageHtml = `<i class="fas ${offer.icon}"></i>`;
        try {
            if (offer.image_path) {
                const img = Array.isArray(offer.image_path) ? offer.image_path[0] : offer.image_path;
                if (img) {
                    imageHtml = `<img src="${img}" alt="${offer.title}"/>`;
                }
            }
        } catch (err) {
            imageHtml = `<i class="fas ${offer.icon}"></i>`;
        }
        
        const buyerInfo = offer.buyer ? '' : '<div class="offer-status">Available</div>';
        const markAsSoldBtn = offer.buyer ? '' : '<button class="mark-sold-btn"><i class="fas fa-check"></i> Mark as Sold</button>';
        
        offerCard.innerHTML = `
            <div class="offer-image">${imageHtml}</div>
            <div class="offer-content">
                <div class="offer-genre">${offer.genre || ''}</div>
                <div class="offer-title">${offer.title || 'Untitled'}</div>
                <div class="offer-description">${offer.description || ''}</div>
                ${buyerInfo}
                <div class="offer-footer">
                    <div class="offer-price">${offer.price || ''}</div>
                    <div class="offer-actions">
                        <button class="edit-offer-btn">Edit</button>
                        ${markAsSoldBtn}
                    </div>
                </div>
            </div>
        `;
        
        const editBtn = offerCard.querySelector('.edit-offer-btn');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditOfferModal(offer);
        });
        
        const markSoldBtn = offerCard.querySelector('.mark-sold-btn');
        if (markSoldBtn) {
            markSoldBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                markOfferAsSold(offer.id);
            });
        }
        
        myOffersGrid.appendChild(offerCard);
    });
}

// Open edit offer modal
function openEditOfferModal(offer) {
    document.getElementById('editOfferId').value = offer.id;
    document.getElementById('editOfferTitle').value = offer.title || '';
    document.getElementById('editOfferDescription').value = offer.description || '';
    document.getElementById('editOfferPrice').value = offer.price || '';
    document.getElementById('editOfferGenre').value = offer.genre || '';
    
    // Format date for datetime-local input
    if (offer.date) {
        const date = new Date(offer.date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        document.getElementById('editOfferDate').value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    clearEditOfferMessage();
    editOfferModal.style.display = 'block';
}

// Setup event handlers
function setupHandlers() {
    // Profile dropdown
    if (profileBtn) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isAuthenticated) {
                profileDropdown.classList.toggle('show');
            }
        });
    }
    
    if (myProfileBtn) {
        myProfileBtn.addEventListener('click', () => {
            profileDropdown.classList.remove('show');
            // Already on profile page
        });
    }
    
    if (messagesBtn) {
        messagesBtn.addEventListener('click', () => {
            profileDropdown.classList.remove('show');
            window.location.href = '/messages/';
        });
    }
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            profileDropdown.classList.remove('show');
            window.location.href = '/';
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await handleLogout();
            profileDropdown.classList.remove('show');
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (profileDropdown && !profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.classList.remove('show');
        }
    });
    
    // Edit offer modal
    if (closeEditOfferModal) {
        closeEditOfferModal.addEventListener('click', () => {
            editOfferModal.style.display = 'none';
            editOfferForm.reset();
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === editOfferModal) {
            editOfferModal.style.display = 'none';
            editOfferForm.reset();
        }
        if (e.target === changePasswordModal) {
            changePasswordModal.style.display = 'none';
            changePasswordForm.reset();
        }
    });
    
    // Edit offer form
    if (editOfferForm) {
        editOfferForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateOffer();
        });
    }
    
    // Change password button
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', () => {
            changePasswordModal.style.display = 'block';
            changePasswordForm.reset();
            clearChangePasswordMessage();
        });
    }
    
    if (closeChangePasswordModal) {
        closeChangePasswordModal.addEventListener('click', () => {
            changePasswordModal.style.display = 'none';
            changePasswordForm.reset();
        });
    }
    
    // Change password form
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await changePassword();
        });
    }
}

// Update offer
async function updateOffer() {
    const offerId = document.getElementById('editOfferId').value;
    const title = document.getElementById('editOfferTitle').value.trim();
    const description = document.getElementById('editOfferDescription').value.trim();
    const price = document.getElementById('editOfferPrice').value.trim();
    const genre = document.getElementById('editOfferGenre').value.trim();
    const date = document.getElementById('editOfferDate').value;
    
    if (!title || !description || !price || !genre || !date) {
        showEditOfferMessage('All fields are required', true);
        return;
    }
    
    try {
        // Format date for API
        let dateFormatted = null;
        if (date) {
            const dateObj = new Date(date);
            dateFormatted = dateObj.toISOString();
        }
        
        const response = await fetch('/api/offers/update/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                offer_id: parseInt(offerId),
                title: title,
                description: description,
                price: price,
                genre: genre,
                date: dateFormatted
            }),
            credentials: 'include',
        });
        
        const data = await response.json();
        
        if (data.success) {
            showEditOfferMessage('Offer updated successfully!', false);
            setTimeout(() => {
                editOfferModal.style.display = 'none';
                editOfferForm.reset();
                loadMyOffers();
            }, 1500);
        } else {
            showEditOfferMessage(data.error || 'Failed to update offer', true);
        }
    } catch (error) {
        showEditOfferMessage('Network error. Please try again.', true);
        console.error('Update offer error:', error);
    }
}

// Change password
async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showChangePasswordMessage('All fields are required', true);
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showChangePasswordMessage('New passwords do not match', true);
        return;
    }
    
    if (newPassword.length < 8) {
        showChangePasswordMessage('New password must be at least 8 characters long', true);
        return;
    }
    
    try {
        // First verify current password by trying to login
        const loginResponse = await fetch('/api/auth/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: profileUsername.textContent,
                password: currentPassword
            }),
            credentials: 'include',
        });
        
        const loginData = await loginResponse.json();
        
        if (!loginData.success) {
            showChangePasswordMessage('Current password is incorrect', true);
            return;
        }
        
        // Update password
        const response = await fetch('/api/user/profile/update/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                password: newPassword
            }),
            credentials: 'include',
        });
        
        const data = await response.json();
        
        if (data.success) {
            showChangePasswordMessage('Password changed successfully!', false);
            setTimeout(() => {
                changePasswordModal.style.display = 'none';
                changePasswordForm.reset();
            }, 1500);
        } else {
            showChangePasswordMessage(data.error || 'Failed to change password', true);
        }
    } catch (error) {
        showChangePasswordMessage('Network error. Please try again.', true);
        console.error('Change password error:', error);
    }
}

// Logout
async function handleLogout() {
    try {
        const response = await fetch('/api/auth/logout/', {
            method: 'POST',
            credentials: 'include',
        });
        const data = await response.json();
        
        if (data.success) {
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Message display functions
function showEditOfferMessage(message, isError = false) {
    const messageEl = document.getElementById('editOfferMessage');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = isError ? 'auth-message error' : 'auth-message success';
    }
}

function clearEditOfferMessage() {
    const messageEl = document.getElementById('editOfferMessage');
    if (messageEl) {
        messageEl.textContent = '';
        messageEl.className = 'auth-message';
    }
}

function showChangePasswordMessage(message, isError = false) {
    const messageEl = document.getElementById('changePasswordMessage');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = isError ? 'auth-message error' : 'auth-message success';
    }
}

function clearChangePasswordMessage() {
    const messageEl = document.getElementById('changePasswordMessage');
    if (messageEl) {
        messageEl.textContent = '';
        messageEl.className = 'auth-message';
    }
}

// Mark offer as sold
async function markOfferAsSold(offerId) {
    if (!confirm('Are you sure you want to mark this offer as sold? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/offers/mark-sold/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                offer_id: offerId
            }),
            credentials: 'include',
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Reload offers to show updated status
            await loadMyOffers();
        } else {
            alert('Failed to mark offer as sold: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error marking offer as sold:', error);
        alert('Failed to mark offer as sold. Please try again.');
    }
}

