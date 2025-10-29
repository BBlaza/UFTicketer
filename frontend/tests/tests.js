(function () {
    const resultsEl = document.getElementById('results');
    const summaryEl = document.getElementById('summary');
    let passed = 0;
    let failed = 0;

    function addResult(name, ok, message) {
        const div = document.createElement('div');
        div.className = `test ${ok ? 'pass' : 'fail'}`;
        div.innerHTML = `<div class="name">${ok ? 'PASS' : 'FAIL'}: ${name}</div>` +
            (message ? `<div class="msg">${message}</div>` : '');
        resultsEl.appendChild(div);
        ok ? passed++ : failed++;
        summaryEl.textContent = `Summary: ${passed} passed, ${failed} failed`;
    }

    function assert(name, condition, message) {
        try {
            addResult(name, !!condition, message || '');
        } catch (e) {
            addResult(name, false, e && e.message ? e.message : String(e));
        }
    }

    // Wait for DOMContentLoaded from script.js to finish rendering offers
    window.addEventListener('load', () => {
        // ---- Test 1: Search filters offers correctly ----
        try {
            const searchInput = document.getElementById('searchInput');
            const offersGrid = document.querySelector('.offers-grid');
            const beforeCount = offersGrid.children.length;

            // Ensure there are initial offers
            assert('Initial offers render', beforeCount > 0, `Found ${beforeCount} cards`);

            // Perform search for "music" (should match at least one seeded offer)
            searchInput.value = 'music';
            if (typeof performSearch === 'function') {
                performSearch();
            } else {
                // Trigger via click as fallback
                document.getElementById('searchBtn').click();
            }

            const afterCount = offersGrid.children.length;
            const allMatch = Array.from(offersGrid.querySelectorAll('.offer-card'))
                .every(card => /music/i.test(card.textContent));

            assert('Search filters to matching cards', afterCount > 0 && allMatch,
                `afterCount=${afterCount}, allMatch=${allMatch}`);
        } catch (e) {
            addResult('Search filters offers correctly', false, e.message || String(e));
        }

        // ---- Test 2: Navbar has Sign in, friends and messages buttons work ----
        try {
            const userName = document.querySelector('.user-name');
            assert('User label shows "Sign in"', userName && userName.textContent.trim() === 'Sign in');

            const friendsBtn = document.getElementById('friendsBtn');
            const messagesBtn = document.getElementById('messagesBtn');
            assert('Friends button exists', !!friendsBtn);
            assert('Messages button exists', !!messagesBtn);

            // Mock alert to capture clicks
            let alerts = [];
            const originalAlert = window.alert;
            window.alert = (msg) => { alerts.push(String(msg)); };

            messagesBtn.click();
            friendsBtn.click();

            const msgClicked = alerts.some(a => /Messages feature coming soon!/i.test(a));
            const friendsClicked = alerts.some(a => /Friends feature coming soon!/i.test(a));
            assert('Messages button click triggers handler', msgClicked);
            assert('Friends button click triggers handler', friendsClicked);

            // Restore alert
            window.alert = originalAlert;
        } catch (e) {
            addResult('Navbar elements and handlers', false, e.message || String(e));
        }
    });
})();


