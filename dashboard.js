document.addEventListener('DOMContentLoaded', () => {

    // Auth Check
    const user = JSON.parse(localStorage.getItem('fastlib_current_user') || 'null');
    if (!user) {
        window.location.href = '/index.html';
        return;
    }

    // Set Navbar Info
    document.getElementById('user-name-nav').textContent = user.name.split(' ')[0];
    document.getElementById('user-avatar-nav').textContent = user.name.charAt(0).toUpperCase();

    // Set Greeting
    document.getElementById('dash-greeting').textContent = `Welcome back, ${user.name.split(' ')[0]} 👋`;

    // Dropdown toggle
    const toggle = document.getElementById('user-menu-toggle');
    const dropdown = document.getElementById('user-dropdown');
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
        if (!document.getElementById('user-nav').contains(e.target)) dropdown.classList.add('hidden');
    });

    // Sign Out
    document.getElementById('signout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('fastlib_current_user');
        window.location.href = '/index.html';
    });

    // Data Load
    function loadData() {
        const key = `fastlib_data_${user.email}`;
        const data = JSON.parse(localStorage.getItem(key) || '{"borrowed":[],"waitlist":[],"history":[]}');
        if (!data.history) data.history = [];
        return data;
    }

    function saveData(data) {
        localStorage.setItem(`fastlib_data_${user.email}`, JSON.stringify(data));
    }

    let libraryData = loadData();

    // Render Stats
    function updateStats() {
        document.getElementById('stat-borrowed').textContent = libraryData.borrowed.length;
        document.getElementById('stat-history').textContent = libraryData.history.length;
        document.getElementById('stat-waitlist').textContent = libraryData.waitlist.length;
    }

    // Tab Logic
    const tabs = document.querySelectorAll('.d-tab');
    const panes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            panes.forEach(p => p.classList.add('hidden'));
            document.getElementById(`tab-content-${tab.dataset.tab}`).classList.remove('hidden');
        });
    });

    // Parse URL hash to open specific tab (e.g. #waitlist)
    if (window.location.hash) {
        const targetTab = window.location.hash.substring(1);
        const tabBtn = document.querySelector(`.d-tab[data-tab="${targetTab}"]`);
        if (tabBtn) tabBtn.click();
    }

    // Core Rendering function
    function renderGrids() {
        updateStats();

        const gridB = document.getElementById('grid-borrowed');
        const gridH = document.getElementById('grid-history');
        const gridW = document.getElementById('grid-waitlist');

        gridB.innerHTML = '';
        gridH.innerHTML = '';
        gridW.innerHTML = '';

        const now = new Date();

        // --- BORROWED ---
        if (libraryData.borrowed.length === 0) {
            gridB.innerHTML = `
                <div style="grid-column: 1/-1;" class="empty-state">
                    <div class="empty-icon">📚</div>
                    <h3 class="empty-title">You don't have any books right now.</h3>
                    <p class="empty-desc">Discover our collection of over 100,000 titles instantly.</p>
                    <a href="/index.html" class="btn-browse">Search Catalog</a>
                </div>
            `;
        } else {
            libraryData.borrowed.forEach(book => {
                const borrowDate = book.borrowDate ? new Date(book.borrowDate) : new Date();
                const dueDate = book.dueDate ? new Date(book.dueDate) : new Date(borrowDate.getTime() + 14 * 24 * 60 * 60 * 1000);
                
                const timeDiff = dueDate.getTime() - now.getTime();
                const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                
                let warningHTML = '';
                let warningClass = '';
                if (daysDiff <= 3 && daysDiff >= 0) {
                    warningHTML = `<div class="due-warning">⚠️ Due in ${daysDiff} day${daysDiff===1?'':'s'}</div>`;
                    warningClass = 'due-soon';
                } else if (daysDiff < 0) {
                    warningHTML = `<div class="due-warning">🚨 Overdue</div>`;
                }

                const [c1, c2] = book.coverGradient || ['#1e3a5f', '#3b82f6'];
                const item = document.createElement('div');
                item.className = `book-card ${warningClass}`;
                item.innerHTML = `
                    ${warningHTML}
                    <div class="book-card-cover" style="background: linear-gradient(135deg, ${c1}, ${c2}); color: white;">📖</div>
                    <div class="book-card-info">
                        <div class="book-card-title">${book.title}</div>
                        <div class="book-card-author">by ${book.author}</div>
                        <div class="book-card-meta">
                            <div class="meta-row"><span class="meta-label">Borrowed:</span> <span class="meta-val">${borrowDate.toLocaleDateString()}</span></div>
                            <div class="meta-row"><span class="meta-label">Due Date:</span> <span class="meta-val" style="color: ${daysDiff <= 3 ? '#dc2626' : 'inherit'}">${dueDate.toLocaleDateString()}</span></div>
                        </div>
                        <button class="btn-return" data-id="${book.id}">Return Book</button>
                    </div>
                `;
                gridB.appendChild(item);
            });
        }

        // --- HISTORY ---
        if (libraryData.history.length === 0) {
            gridH.innerHTML = `
                <div style="grid-column: 1/-1;" class="empty-state">
                    <div class="empty-icon">⏱️</div>
                    <h3 class="empty-title">Your history is empty.</h3>
                    <p class="empty-desc">Books you return will appear here.</p>
                </div>
            `;
        } else {
            libraryData.history.forEach(book => {
                const [c1, c2] = book.coverGradient || ['#1e3a5f', '#3b82f6'];
                const d = book.returnedDate ? new Date(book.returnedDate).toLocaleDateString() : 'Recently';
                const item = document.createElement('div');
                item.className = 'book-card';
                item.innerHTML = `
                    <div class="book-card-cover" style="background: linear-gradient(135deg, ${c1}, ${c2}); color: white; opacity: 0.8;">📖</div>
                    <div class="book-card-info" style="opacity: 0.8;">
                        <div class="book-card-title">${book.title}</div>
                        <div class="book-card-author">by ${book.author}</div>
                        <div class="book-card-meta" style="margin-top: auto;">
                            <div class="meta-row"><span class="meta-label">Returned:</span> <span class="meta-val">${d}</span></div>
                        </div>
                    </div>
                `;
                gridH.appendChild(item);
            });
        }

        // --- WAITLIST ---
        if (libraryData.waitlist.length === 0) {
            gridW.innerHTML = `
                <div style="grid-column: 1/-1;" class="empty-state">
                    <div class="empty-icon">🔔</div>
                    <h3 class="empty-title">No active waitlists.</h3>
                    <p class="empty-desc">You'll be notified when waitlisted books become available.</p>
                </div>
            `;
        } else {
            libraryData.waitlist.forEach(book => {
                const [c1, c2] = book.coverGradient || ['#1e3a5f', '#3b82f6'];
                const item = document.createElement('div');
                item.className = 'book-card';
                item.innerHTML = `
                    <div class="book-card-cover" style="background: linear-gradient(135deg, ${c1}, ${c2}); color: white;">📖</div>
                    <div class="book-card-info">
                        <div class="book-card-title">${book.title}</div>
                        <div class="book-card-author">by ${book.author}</div>
                        <div class="book-card-meta">
                            <div class="meta-row"><span class="meta-label">Status:</span> <span class="meta-val" style="color: #d97706;">In Queue</span></div>
                        </div>
                        <button class="btn-return" data-waitlist-id="${book.id}">Leave Waitlist</button>
                    </div>
                `;
                gridW.appendChild(item);
            });
        }

        attachActions();
    }

    function attachActions() {
        // Return Book Action
        document.querySelectorAll('button[data-id]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                const bookIndex = libraryData.borrowed.findIndex(b => b.id === id);
                if (bookIndex > -1) {
                    const book = libraryData.borrowed.splice(bookIndex, 1)[0];
                    book.returnedDate = new Date().toISOString();
                    libraryData.history.unshift(book); // add to top of history
                    saveData(libraryData);
                    renderGrids();
                    showToast(`"${book.title}" returned successfully!`, 'success');
                }
            });
        });

        // Leave Waitlist Action
        document.querySelectorAll('button[data-waitlist-id]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.waitlistId);
                libraryData.waitlist = libraryData.waitlist.filter(b => b.id !== id);
                saveData(libraryData);
                renderGrids();
                showToast(`Removed from waitlist.`, 'info');
            });
        });
    }

    // Notifications function mapping to the style we already have
    function showToast(message, type = 'info', duration = 3500) {
        const container = document.getElementById('toast-container');
        const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.35s forwards';
            setTimeout(() => toast.remove(), 350);
        }, duration);
    }

    // Init Page
    renderGrids();

    document.getElementById('logo-home').addEventListener('click', () => {
        window.location.href = '/index.html';
    });

});
