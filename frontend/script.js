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
        const resp = await fetch('offers.json');
        const data = await resp.json();
        // Expecting array of offers directly in the JSON file
        offers = Array.isArray(data) ? data : [];
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
        offerCard.innerHTML = `
            <div class="offer-image">
                <i class="fas ${offer.icon}"></i>
            </div>
            <div class="offer-content">
                <div class="offer-category">${offer.category}</div>
                <div class="offer-title">${offer.title}</div>
                <div class="offer-description">${offer.description}</div>
                <div class="offer-footer">
                    <div class="offer-price">${offer.price}</div>
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

