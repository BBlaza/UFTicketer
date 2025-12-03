// Messages page functionality
let isAuthenticated = false;
let currentUserId = null;
let currentPartnerId = null;
let currentPartnerUsername = null;

// DOM Elements
const profileBtn = document.getElementById('profileBtn');
const profileDropdown = document.getElementById('profileDropdown');
const myProfileBtn = document.getElementById('myProfileBtn');
const messagesBtn = document.getElementById('messagesBtn');
const settingsBtn = document.getElementById('settingsBtn');
const logoutBtn = document.getElementById('logoutBtn');
const conversationsList = document.getElementById('conversationsList');
const messagesPanel = document.getElementById('messagesPanel');
const noConversationSelected = document.getElementById('noConversationSelected');
const messagesList = document.getElementById('messagesList');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const conversationPartnerName = document.getElementById('conversationPartnerName');
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submitBtn');
const switchModeBtn = document.getElementById('switchModeBtn');
const modalTitle = document.getElementById('modalTitle');
const switchModeText = document.getElementById('switchModeText');
const authMessage = document.getElementById('authMessage');
const closeModal = document.getElementById('closeModal');

// Auth state
let isLoginMode = true;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupAuthHandlers();
    if (isAuthenticated) {
        loadConversations();
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
            currentUserId = data.user_id || null;
            if (profileBtn) {
                profileBtn.querySelector('.user-name').textContent = data.username;
            }
            loadConversations();
            
            // Check if we need to open a specific conversation (from URL params)
            const urlParams = new URLSearchParams(window.location.search);
            const partnerId = urlParams.get('partner');
            const partnerUsername = urlParams.get('username');
            if (partnerId && partnerUsername) {
                selectConversation(parseInt(partnerId), partnerUsername);
            }
        } else {
            isAuthenticated = false;
            if (profileBtn) {
                profileBtn.querySelector('.user-name').textContent = 'Sign in';
            }
        }
    } catch (error) {
        console.error('Auth status check error:', error);
        isAuthenticated = false;
    }
}

// Load conversations list
async function loadConversations() {
    if (!isAuthenticated) return;
    
    try {
        conversationsList.innerHTML = '<div class="conversations-loading">Loading conversations...</div>';
        
        const response = await fetch('/dm/conversations/', {
            credentials: 'include',
        });
        const data = await response.json();
        
        if (data.success && data.conversations && data.conversations.length > 0) {
            conversationsList.innerHTML = '';
            data.conversations.forEach(conv => {
                const item = document.createElement('div');
                item.className = 'conversation-item';
                item.dataset.partnerId = conv.partner_id;
                item.dataset.partnerUsername = conv.partner_username;
                
                const preview = conv.last_message.length > 50 
                    ? conv.last_message.substring(0, 50) + '...' 
                    : conv.last_message;
                
                item.innerHTML = `
                    <h4>${escapeHtml(conv.partner_username)}</h4>
                    <p>${escapeHtml(preview)}</p>
                `;
                
                item.addEventListener('click', () => {
                    selectConversation(conv.partner_id, conv.partner_username);
                });
                
                conversationsList.appendChild(item);
            });
        } else {
            conversationsList.innerHTML = '<div class="conversations-empty">No conversations yet</div>';
        }
    } catch (error) {
        console.error('Error loading conversations:', error);
        conversationsList.innerHTML = '<div class="conversations-empty">Failed to load conversations</div>';
    }
}

// Select a conversation (can be called with partnerId and username to start new conversation)
async function selectConversation(partnerId, partnerUsername) {
    currentPartnerId = partnerId;
    currentPartnerUsername = partnerUsername;
    
    // Update UI - mark active conversation if it exists in the list
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
        if (parseInt(item.dataset.partnerId) === partnerId) {
            item.classList.add('active');
        }
    });
    
    // If conversation doesn't exist in list, create a temporary one
    const existingItem = document.querySelector(`.conversation-item[data-partner-id="${partnerId}"]`);
    if (!existingItem) {
        // Add to conversations list temporarily
        const item = document.createElement('div');
        item.className = 'conversation-item active';
        item.dataset.partnerId = partnerId;
        item.dataset.partnerUsername = partnerUsername;
        item.innerHTML = `
            <h4>${escapeHtml(partnerUsername)}</h4>
            <p>New conversation</p>
        `;
        conversationsList.insertBefore(item, conversationsList.firstChild);
    }
    
    // Show messages panel
    noConversationSelected.style.display = 'none';
    messagesPanel.style.display = 'flex';
    conversationPartnerName.textContent = partnerUsername;
    
    // Load messages
    await loadMessages(partnerId);
}

// Load messages for a conversation
async function loadMessages(partnerId) {
    if (!isAuthenticated) return;
    
    try {
        messagesList.innerHTML = '<div class="conversations-loading">Loading messages...</div>';
        
        const response = await fetch(`/dm/conversation/${partnerId}/`, {
            credentials: 'include',
        });
        const data = await response.json();
        
        if (data.success && data.messages && data.messages.length > 0) {
            messagesList.innerHTML = '';
            data.messages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = `message-item ${msg.is_sent ? 'sent' : 'received'}`;
                
                const timestamp = new Date(msg.timestamp);
                const formattedTime = timestamp.toLocaleString();
                
                messageDiv.innerHTML = `
                    <div class="message-content">${escapeHtml(msg.content)}</div>
                    <div class="message-meta">${formattedTime}</div>
                `;
                
                messagesList.appendChild(messageDiv);
            });
            
            // Scroll to bottom
            messagesList.scrollTop = messagesList.scrollHeight;
        } else {
            messagesList.innerHTML = '<div class="conversations-empty">No messages yet. Start the conversation!</div>';
        }
    } catch (error) {
        console.error('Error loading messages:', error);
        messagesList.innerHTML = '<div class="conversations-empty">Failed to load messages</div>';
    }
}

// Send a message
async function sendMessage() {
    if (!isAuthenticated || !currentPartnerId) return;
    
    const content = messageInput.value.trim();
    if (!content) return;
    
    try {
        sendMessageBtn.disabled = true;
        
        const response = await fetch('/dm/send/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                receiver_id: currentPartnerId,
                content: content
            }),
            credentials: 'include',
        });
        
        const data = await response.json();
        
        if (data.success) {
            messageInput.value = '';
            // Reload messages to show the new one
            await loadMessages(currentPartnerId);
            // Reload conversations to update last message
            await loadConversations();
        } else {
            alert('Failed to send message: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message. Please try again.');
    } finally {
        sendMessageBtn.disabled = false;
    }
}

// Event listeners
if (sendMessageBtn) {
    sendMessageBtn.addEventListener('click', sendMessage);
}

if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

// Profile dropdown handlers
if (profileBtn) {
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isAuthenticated) {
            profileDropdown.classList.toggle('show');
        } else {
            if (authModal) authModal.style.display = 'block';
        }
    });
}

if (messagesBtn) {
    messagesBtn.addEventListener('click', () => {
        profileDropdown.classList.remove('show');
        // Already on messages page, just reload
        loadConversations();
    });
}

if (myProfileBtn) {
    myProfileBtn.addEventListener('click', () => {
        profileDropdown.classList.remove('show');
        window.location.href = '/';
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

// Auth functions
function setupAuthHandlers() {
    if (authForm) {
        authForm.addEventListener('submit', handleAuthSubmit);
    }
    if (switchModeBtn) {
        switchModeBtn.addEventListener('click', toggleAuthMode);
    }
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            if (authModal) authModal.style.display = 'none';
            resetAuthForm();
        });
    }
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    updateAuthModeUI();
}

function updateAuthModeUI() {
    if (!modalTitle || !submitBtn || !switchModeText || !switchModeBtn) return;
    
    if (isLoginMode) {
        modalTitle.textContent = 'Sign In';
        submitBtn.textContent = 'Sign In';
        switchModeText.textContent = "Don't have an account?";
        switchModeBtn.textContent = 'Sign Up';
        if (passwordInput) passwordInput.setAttribute('autocomplete', 'current-password');
    } else {
        modalTitle.textContent = 'Sign Up';
        submitBtn.textContent = 'Sign Up';
        switchModeText.textContent = 'Already have an account?';
        switchModeBtn.textContent = 'Log In';
        if (passwordInput) passwordInput.setAttribute('autocomplete', 'new-password');
    }
    clearAuthMessage();
}

function resetAuthForm() {
    isLoginMode = true;
    updateAuthModeUI();
    if (authForm) authForm.reset();
    clearAuthMessage();
}

function clearAuthMessage() {
    if (authMessage) {
        authMessage.textContent = '';
        authMessage.className = 'auth-message';
    }
}

function showAuthMessage(message, isError = false) {
    if (authMessage) {
        authMessage.textContent = message;
        authMessage.className = isError ? 'auth-message error' : 'auth-message success';
    }
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
            credentials: 'include',
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAuthMessage(data.message || (isLoginMode ? 'Login successful!' : 'Account created successfully!'), false);
            isAuthenticated = true;
            if (profileBtn) {
                profileBtn.querySelector('.user-name').textContent = data.username;
            }
            if (authModal) authModal.style.display = 'none';
            resetAuthForm();
            await checkAuthStatus();
            loadConversations();
        } else {
            showAuthMessage(data.error || 'An error occurred', true);
        }
    } catch (error) {
        showAuthMessage('Network error. Please try again.', true);
        console.error('Auth error:', error);
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
            if (profileBtn) {
                profileBtn.querySelector('.user-name').textContent = 'Sign in';
            }
            window.location.reload();
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

