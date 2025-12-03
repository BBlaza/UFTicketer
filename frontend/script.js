// Offers will be loaded from backend API
let offers = [];
let currentPage = 1;
const pageSize = 9;
let totalPages = 1;
let paginationAttached = false;

// DOM Elements
const profileBtn = document.getElementById('profileBtn');
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
const offerDetailsModal = document.getElementById('offerDetailsModal');
const closeOfferModal = document.getElementById('closeOfferModal');
const profileDropdown = document.getElementById('profileDropdown');
const myProfileBtn = document.getElementById('myProfileBtn');
const friendsDropdownBtn = document.getElementById('friendsDropdownBtn');
const settingsBtn = document.getElementById('settingsBtn');
const logoutBtn = document.getElementById('logoutBtn');
const myProfileModal = document.getElementById('myProfileModal');
const closeProfileModal = document.getElementById('closeProfileModal');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsModal = document.getElementById('closeSettingsModal');
const settingsForm = document.getElementById('settingsForm');
const messagesBtn = document.getElementById('messagesBtn');
const messagesModal = document.getElementById('messagesModal');
const closeMessagesModal = document.getElementById('closeMessagesModal');
const inboxList = document.getElementById('inboxList');
const conversationArea = document.getElementById('conversationArea');
const conversationSelect = document.getElementById('conversationSelect');

// user picks a conversation from the dropdown
if (conversationSelect) {
    conversationSelect.addEventListener('change', () => {
        const val = conversationSelect.value;
        if (!val) {
            conversationArea.innerHTML = '<p>Select a conversation to view messages.</p>';
            return;
        }
        const username =
            conversationSelect.options[conversationSelect.selectedIndex].textContent;
        openConversation(val, username);
    });
}

// Store current offer being viewed
let currentOffer = null;

// Auth state
let isAuthenticated = false;
let currentUserId = null;

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
    // initialize pagination
    totalPages = Math.max(1, Math.ceil(offers.length / pageSize));
    currentPage = 1;
    updatePageInput();
    updatePageInfo();
    if (!paginationAttached) {
        attachPaginationHandlers();
        paginationAttached = true;
    }
    renderPage(currentPage);
}

function attachPaginationHandlers() {
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageInput = document.getElementById('pageInput');

    if (prevBtn) prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goToPage(currentPage + 1));

    if (pageInput) {
        pageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const v = parseInt(pageInput.value, 10);
                if (!isNaN(v)) goToPage(v);
            }
        });

        pageInput.addEventListener('blur', () => {
            const v = parseInt(pageInput.value, 10);
            if (!isNaN(v)) goToPage(v);
            else updatePageInput();
        });
    }
}

function updatePageInput() {
    const pageInput = document.getElementById('pageInput');
    if (pageInput) pageInput.value = String(currentPage);
}

function updatePageInfo() {
    const info = document.getElementById('pageInfo');
    if (info) info.textContent = `Page ${currentPage} of ${totalPages}`;
}

function goToPage(page) {
    const p = Math.max(1, Math.min(totalPages, Number(page)));
    if (p === currentPage) return;
    currentPage = p;
    updatePageInput();
    renderPage(currentPage);
}

function renderPage(page) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageSlice = offers.slice(start, end);
    displayOffers(pageSlice);
    updatePageInfo();
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

        offerCard.innerHTML = `
            <div class="offer-image">${imageHtml}</div>
            <div class="offer-content">
                <div class="offer-genre">${offer.genre || ''}</div>
                <div class="offer-title">${offer.title || 'Untitled'}</div>
                <div class="offer-description">${offer.description || ''}</div>
                <div class="offer-meta">Seller: ${sellerName}</div>
                <div class="offer-footer">
                    <div class="offer-price">${offer.price || ''}</div>
                    <button class="view-btn">View Details</button>
                </div>
            </div>
        `;
        
        offerCard.addEventListener('click', () => {
            showOfferDetails(offer);
        });
        
        offersGrid.appendChild(offerCard);
    });
}

// Calculate days ago from a date string
function getDaysAgo(dateString) {
    if (!dateString) return 'Date not available';
    
    try {
        const offerDate = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - offerDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return 'Posted today';
        } else if (diffDays === 1) {
            return 'Posted 1 day ago';
        } else {
            return `Posted ${diffDays} days ago`;
        }
    } catch (error) {
        return 'Date not available';
    }
}

// Show offer details in modal
function showOfferDetails(offer) {
    // Store current offer
    currentOffer = offer;
    
    // Set image
    const imageContainer = document.getElementById('offerDetailsImage');
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
    imageContainer.innerHTML = imageHtml;
    
    // Set other details
    document.getElementById('offerDetailsTitle').textContent = offer.title || 'Untitled';
    document.getElementById('offerDetailsSeller').textContent = offer.seller || 'Unknown';
    document.getElementById('offerDetailsGenre').textContent = offer.genre || 'Not specified';
    document.getElementById('offerDetailsDescription').textContent = offer.description || 'No description available.';
    document.getElementById('offerDetailsPrice').textContent = offer.price || '$0.00';
    document.getElementById('offerDetailsDate').textContent = getDaysAgo(offer.date);
    
    // Show/hide send message button based on authentication and if user is not the seller
    if (isAuthenticated && offer.seller) {
        // Show button if authenticated (we'll check if user is buyer later)
        sendMessageBtn.style.display = 'block';
    } else {
        sendMessageBtn.style.display = 'none';
    }
    
    // Show modal
    offerDetailsModal.style.display = 'block';
}

// Offer details modal handlers
if (closeOfferModal) {
    closeOfferModal.addEventListener('click', () => {
        offerDetailsModal.style.display = 'none';
    });
}

window.addEventListener('click', (e) => {
    if (e.target === offerDetailsModal) {
        offerDetailsModal.style.display = 'none';
    }
    if (e.target === myProfileModal) {
        myProfileModal.style.display = 'none';
    }
    if (e.target === settingsModal) {
        settingsModal.style.display = 'none';
    }
});

// My Profile Modal handlers
if (closeProfileModal) {
    closeProfileModal.addEventListener('click', () => {
        myProfileModal.style.display = 'none';
    });
}

async function showMyProfile() {
    try {
        const response = await fetch('/api/user/profile/', {
            credentials: 'include',
        });
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('profileUsername').textContent = data.username || 'Not set';
            document.getElementById('profileIntroduction').textContent = data.introduction || 'No introduction set.';
            myProfileModal.style.display = 'block';
        } else {
            alert('Failed to load profile: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Profile load error:', error);
        alert('Failed to load profile. Please try again.');
    }
}

// Settings Modal handlers
if (closeSettingsModal) {
    closeSettingsModal.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });
}

async function showSettings() {
    try {
        const response = await fetch('/api/user/profile/', {
            credentials: 'include',
        });
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('settingsUsername').value = data.username || '';
            document.getElementById('settingsIntroduction').value = data.introduction || '';
            document.getElementById('settingsPassword').value = '';
            clearSettingsMessage();
            settingsModal.style.display = 'block';
        } else {
            alert('Failed to load settings: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Settings load error:', error);
        alert('Failed to load settings. Please try again.');
    }
}

if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearSettingsMessage();
        
        const username = document.getElementById('settingsUsername').value.trim();
        const password = document.getElementById('settingsPassword').value;
        const introduction = document.getElementById('settingsIntroduction').value.trim();
        
        try {
            const response = await fetch('/api/user/profile/update/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    password: password || undefined,
                    introduction: introduction
                }),
                credentials: 'include',
            });
            
            const data = await response.json();
            
            if (data.success) {
                showSettingsMessage('Settings updated successfully!', false);
                // Update profile button if username changed
                if (data.username) {
                    profileBtn.querySelector('.user-name').textContent = data.username;
                }
                // Close modal after a delay
                setTimeout(() => {
                    settingsModal.style.display = 'none';
                }, 1500);
            } else {
                showSettingsMessage(data.error || 'Failed to update settings', true);
            }
        } catch (error) {
            showSettingsMessage('Network error. Please try again.', true);
            console.error('Settings update error:', error);
        }
    });
}

function showSettingsMessage(message, isError = false) {
    const messageEl = document.getElementById('settingsMessage');
    messageEl.textContent = message;
    messageEl.className = isError ? 'auth-message error' : 'auth-message success';
}

function clearSettingsMessage() {
    const messageEl = document.getElementById('settingsMessage');
    messageEl.textContent = '';
    messageEl.className = 'auth-message';
}

// Send message to buyer handler
if (sendMessageBtn) {
    sendMessageBtn.addEventListener('click', async () => {
        if (!currentOffer) {
            alert('No offer selected.');
            return;
        }

        // For now, we need a receiver_id. If your offer object has seller_id from backend, use that.
        // TEMP: if you don't have seller_id yet, you can hardcode 2 just to test end-to-end.
        const receiverId = currentOffer.seller_id;

        const content = prompt(`Message to ${currentOffer.seller || 'seller'}:`);
        if (!content || !content.trim()) {
            return;
        }

        try {
            const resp = await fetch('/dm/send/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sender_id: currentUserId,      
                    receiver_id: receiverId,
                    content: content.trim(),
                }),
            });

            const data = await resp.json();

            if (resp.ok && data.id) {
                alert('Message sent!');
            } else {
                alert('Failed to send message: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('DM error:', err);
            alert('Network error while sending message.');
        }
    });
}
async function showConversationWith(receiverId) {
    const url = `/dm/conversation/${currentUserId}/${receiverId}/`;
    try {
        const resp = await fetch(url);
        const data = await resp.json();
        console.log('Conversation:', data);
        //alert messages
        alert('Messages:\n' + data.map(m => `${m.sender}: ${m.content}`).join('\n'));
    } catch (err) {
        console.error('Error loading conversation', err);
    }
}

if (messagesBtn) {
    messagesBtn.addEventListener('click', async () => {
        profileDropdown.classList.remove('show');

        //auth check
        if (!isAuthenticated) {
            alert('Please sign in to view your DMs.');
            return;
        }

        // Load inbox
        await loadInbox();
        messagesModal.style.display = 'block';
    });
}

//close inbox
if (closeMessagesModal) {
    closeMessagesModal.addEventListener('click', () => {
        messagesModal.style.display = 'none';
    });
}

async function loadInbox() {
    // Debug
    console.log('loadInbox called. currentUserId =', currentUserId);

    //get user id from global variable
    const userId = currentUserId;
    inboxList.innerHTML = 'Loading...';
    conversationArea.innerHTML = '';

    try {
        const resp = await fetch(`/dm/inbox/${currentUserId}/`);
        const data = await resp.json();

        if (!Array.isArray(data) || data.length === 0) {
            inboxList.innerHTML = '<p>No conversations yet.</p>';
            return;
        }

        inboxList.innerHTML = '';

        data.forEach(thread => {
            //left side inbox item
            const item = document.createElement('div');
            item.className = 'inbox-item';
            item.innerHTML = `
                <strong>${thread.partner_username}</strong><br>
                <span>${thread.last_message}</span><br>
                <span class="msg-meta">${new Date(thread.last_timestamp).toLocaleString()}</span>
            `;
            item.addEventListener('click', () => {
                if (conversationSelect) {
                    conversationSelect.value = String(thread.partner_id);
                }
                openConversation(thread.partner_id, thread.partner_username);
            });
            inboxList.appendChild(item);

            // right side conversation select option
            if (conversationSelect) {
                const opt = document.createElement('option');
                opt.value = thread.partner_id;
                opt.textContent = thread.partner_username;
                conversationSelect.appendChild(opt);
            }
        });
    } catch (err) {
        console.error('Inbox load error:', err);
        inboxList.innerHTML = '<p>Failed to load inbox.</p>';
    }
}
async function openConversation(partnerId, partnerUsername) {
    const userId = currentUserId;
    conversationArea.innerHTML = 'Loading...';

    try {
        //fetch conversation
        const resp = await fetch(`/dm/conversation/${currentUserId}/${partnerId}/`);
        if (!resp.ok) {
            conversationArea.innerHTML = '<p>Failed to load conversation.</p>';
            return;
        }
        const data = await resp.json();
        //no mesg yet
        if (!Array.isArray(data) || data.length === 0) {
            conversationArea.innerHTML = `<p>No messages with ${partnerUsername} yet.</p>`;
            return;
        }

        const msgsHtml = data.map(m => {
            const who = m.sender;
            return `
                <p><strong>${who}:</strong> ${m.content}</p>
            `;
        }).join('');

        conversationArea.innerHTML = `
            <h3>Conversation with ${partnerUsername}</h3>
            <div class="conversation-messages">
                ${msgsHtml}
            </div>
        `;
    } catch (err) {
        console.error('Conversation load error:', err);
        conversationArea.innerHTML = '<p>Failed to load conversation.</p>';
    }
}

// Profile button handler - show dropdown if authenticated, otherwise show sign-in modal
profileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isAuthenticated) {
        // Toggle dropdown
        profileDropdown.classList.toggle('show');
    } else {
        // Show sign-in modal
        resetAuthForm();
        authModal.style.display = 'block';
    }
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (profileDropdown && !profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.classList.remove('show');
    }
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

// Profile dropdown handlers
if (myProfileBtn) {
    myProfileBtn.addEventListener('click', async () => {
        profileDropdown.classList.remove('show');
        await showMyProfile();
    });
}

if (settingsBtn) {
    settingsBtn.addEventListener('click', async () => {
        profileDropdown.classList.remove('show');
        await showSettings();
    });
}

if (friendsDropdownBtn) {
    friendsDropdownBtn.addEventListener('click', () => {
        alert('Friends feature coming soon!');
        profileDropdown.classList.remove('show');
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await handleLogout();
        profileDropdown.classList.remove('show');
    });
}

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
            // Update authentication state
            isAuthenticated = true;
            profileBtn.querySelector('.user-name').textContent = data.username;
            // Close modal after a short delay
            setTimeout(() => {
                authModal.style.display = 'none';
                resetAuthForm();
            }, 1500);
            if (data.user_id) {
                currentUserId = data.user_id;
            } else {
                currentUserId = null;
            }
            
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
            isAuthenticated = true;
            if (data.user_id) {
                currentUserId = data.user_id;
            }
            profileBtn.querySelector('.user-name').textContent = data.username;
        } else {
            isAuthenticated = false;
            profileBtn.querySelector('.user-name').textContent = 'Sign in';
        }
    } catch (error) {
        console.error('Auth status check error:', error);
        isAuthenticated = false;
    }
}

async function handleLogout() {
    try {
        const response = await fetch('/api/auth/logout/', {
            method: 'POST',
            credentials: 'include',
        });
        const data = await response.json();
        
        if (data.success) {
            isAuthenticated = false;
            profileBtn.querySelector('.user-name').textContent = 'Sign in';
            // Optionally reload the page or show a message
            window.location.reload();
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

