// Offers will be loaded from backend API
let offers = [];

// DOM Elements
const profileBtn = document.getElementById('profileBtn');
const messagesBtn = document.getElementById('messagesBtn');
const friendsBtn = document.getElementById('friendsBtn');
const profileModal = document.getElementById('profileModal');
const closeModal = document.getElementById('closeModal');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const offersGrid = document.querySelector('.offers-grid');

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    fetchOffersAndRender();
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
                <div class="offer-category">${offer.category || ''}</div>
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

// Profile modal handlers
profileBtn.addEventListener('click', () => {
    profileModal.style.display = 'block';
});

// Messages button handler
messagesBtn.addEventListener('click', () => {
    alert('Messages feature coming soon!');
});

// Friends button handler
friendsBtn.addEventListener('click', () => {
    alert('Friends feature coming soon!');
});

closeModal.addEventListener('click', () => {
    profileModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === profileModal) {
        profileModal.style.display = 'none';
    }
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
        offer.category.toLowerCase().includes(searchTerm) ||
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

// Menu item click handlers
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
        const text = item.textContent.trim();
        alert(`${text} clicked`);
        profileModal.style.display = 'none';
    });
});

