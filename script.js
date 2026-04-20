document.addEventListener('DOMContentLoaded', () => {

    // ============================
    // State & DOM References
    // ============================
    const searchInput = document.getElementById('main-search');
    const searchResults = document.getElementById('search-results');
    const statCards = document.querySelectorAll('.stat-card');

    // Auth elements
    const authModal = document.getElementById('auth-modal');
    const authModalClose = document.getElementById('auth-modal-close');
    const openSigninBtn = document.getElementById('open-signin-btn');
    const guestNav = document.getElementById('guest-nav');
    const userNav = document.getElementById('user-nav');
    const userMenuToggle = document.getElementById('user-menu-toggle');
    const userDropdown = document.getElementById('user-dropdown');
    const signinForm = document.getElementById('signin-form');
    const registerForm = document.getElementById('register-form');
    const tabSignin = document.getElementById('tab-signin');
    const tabRegister = document.getElementById('tab-register');
    const signoutBtn = document.getElementById('signout-btn');
    const signinError = document.getElementById('signin-error');
    const registerError = document.getElementById('register-error');

    // Book modal
    const bookModal = document.getElementById('book-modal');
    const bookModalClose = document.getElementById('modal-close');

    // Library modal
    const libraryModal = document.getElementById('library-modal');
    const libraryModalClose = document.getElementById('library-modal-close');
    const libraryModalTitle = document.getElementById('library-modal-title');
    const libraryModalContent = document.getElementById('library-modal-content');

    // ============================
    // Auth State (localStorage)
    // ============================
    function getUsers() {
        return JSON.parse(localStorage.getItem('fastlib_users') || '[]');
    }

    function getCurrentUser() {
        return JSON.parse(localStorage.getItem('fastlib_current_user') || 'null');
    }

    function saveCurrentUser(user) {
        localStorage.setItem('fastlib_current_user', JSON.stringify(user));
    }

    function getUserData(email) {
        const key = `fastlib_data_${email}`;
        return JSON.parse(localStorage.getItem(key) || '{"borrowed":[],"waitlist":[]}');
    }

    function saveUserData(email, data) {
        localStorage.setItem(`fastlib_data_${email}`, JSON.stringify(data));
    }

    function initAuthUI() {
        const user = getCurrentUser();
        if (user) {
            guestNav.classList.add('hidden');
            userNav.classList.remove('hidden');
            const initial = user.name.charAt(0).toUpperCase();
            document.getElementById('user-avatar-nav').textContent = initial;
            document.getElementById('user-name-nav').textContent = user.name.split(' ')[0];
            document.getElementById('dropdown-avatar').textContent = initial;
            document.getElementById('dropdown-name').textContent = user.name;
            document.getElementById('dropdown-email').textContent = user.email;
        } else {
            guestNav.classList.remove('hidden');
            userNav.classList.add('hidden');
        }
    }

    initAuthUI();

    // ============================
    // Auth Modal: Open / Close
    // ============================
    function openAuthModal(tab = 'signin') {
        authModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        switchAuthTab(tab);
    }

    function closeAuthModal() {
        authModal.classList.add('hidden');
        document.body.style.overflow = '';
        signinError.classList.add('hidden');
        registerError.classList.add('hidden');
        signinForm.reset();
        registerForm.reset();
    }

    openSigninBtn.addEventListener('click', () => openAuthModal('signin'));
    document.getElementById('footer-signin').addEventListener('click', (e) => {
        e.preventDefault();
        openAuthModal('signin');
    });
    authModalClose.addEventListener('click', closeAuthModal);
    authModal.addEventListener('click', (e) => { if (e.target === authModal) closeAuthModal(); });

    // ============================
    // Auth Tabs
    // ============================
    function switchAuthTab(tab) {
        if (tab === 'signin') {
            tabSignin.classList.add('active');
            tabRegister.classList.remove('active');
            signinForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        } else {
            tabRegister.classList.add('active');
            tabSignin.classList.remove('active');
            registerForm.classList.remove('hidden');
            signinForm.classList.add('hidden');
        }
    }

    tabSignin.addEventListener('click', () => switchAuthTab('signin'));
    tabRegister.addEventListener('click', () => switchAuthTab('register'));
    document.getElementById('switch-to-register').addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('register'); });
    document.getElementById('switch-to-signin').addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('signin'); });

    // ============================
    // Sign In
    // ============================
    signinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('signin-email').value.trim().toLowerCase();
        const password = document.getElementById('signin-password').value;
        const users = getUsers();
        const user = users.find(u => u.email === email && u.password === password);

        if (!user) {
            signinError.textContent = 'Invalid email or password. Try registering a new account.';
            signinError.classList.remove('hidden');
            return;
        }

        saveCurrentUser(user);
        initAuthUI();
        closeAuthModal();
        showToast(`Welcome back, ${user.name.split(' ')[0]}! 👋`, 'success');
    });

    // ============================
    // Register
    // ============================
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim().toLowerCase();
        const password = document.getElementById('reg-password').value;

        if (password.length < 6) {
            registerError.textContent = 'Password must be at least 6 characters.';
            registerError.classList.remove('hidden');
            return;
        }

        const users = getUsers();
        if (users.find(u => u.email === email)) {
            registerError.textContent = 'An account with this email already exists.';
            registerError.classList.remove('hidden');
            return;
        }

        const newUser = { name, email, password };
        users.push(newUser);
        localStorage.setItem('fastlib_users', JSON.stringify(users));
        saveCurrentUser(newUser);
        initAuthUI();
        closeAuthModal();
        showToast(`Account created! Welcome to FastLib, ${name.split(' ')[0]}! 🎉`, 'success');
    });

    // ============================
    // Sign Out
    // ============================
    signoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const user = getCurrentUser();
        localStorage.removeItem('fastlib_current_user');
        initAuthUI();
        userDropdown.classList.add('hidden');
        showToast('Signed out successfully. See you soon!', 'info');
    });

    // ============================
    // User Dropdown Toggle
    // ============================
    userMenuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!userNav.contains(e.target)) {
            userDropdown.classList.add('hidden');
        }
    });

    // ============================
    // My Books / Waitlist links
    // ============================
    document.getElementById('my-books-link').addEventListener('click', (e) => {
        e.preventDefault();
        userDropdown.classList.add('hidden');
        openLibraryModal('borrowed');
    });

    document.getElementById('waitlist-link').addEventListener('click', (e) => {
        e.preventDefault();
        userDropdown.classList.add('hidden');
        openLibraryModal('waitlist');
    });

    document.getElementById('profile-link').addEventListener('click', (e) => {
        e.preventDefault();
        userDropdown.classList.add('hidden');
        openProfileModal();
    });

    // ============================
    // Profile Settings Modal
    // ============================
    const profileModal = document.getElementById('profile-modal');
    const profileModalClose = document.getElementById('profile-modal-close');
    const ptabAccount = document.getElementById('ptab-account');
    const ptabPassword = document.getElementById('ptab-password');
    const profileAccountForm = document.getElementById('profile-account-form');
    const profilePasswordForm = document.getElementById('profile-password-form');
    const profileAccountMsg = document.getElementById('profile-account-msg');
    const profilePwMsg = document.getElementById('profile-pw-msg');

    function openProfileModal() {
        const user = getCurrentUser();
        if (!user) { openAuthModal(); return; }

        // Populate header & form
        document.getElementById('profile-avatar-large').textContent = user.name.charAt(0).toUpperCase();
        document.getElementById('profile-display-name').textContent = user.name;
        document.getElementById('profile-display-email').textContent = user.email;
        document.getElementById('profile-name').value = user.name;
        document.getElementById('profile-email').value = user.email;

        // Reset pw fields & tab
        profilePasswordForm.reset();
        profileAccountForm.reset();
        document.getElementById('profile-name').value = user.name;
        document.getElementById('profile-email').value = user.email;
        showProfileTab('account');
        hideFormMsg(profileAccountMsg);
        hideFormMsg(profilePwMsg);

        profileModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeProfileModal() {
        profileModal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    profileModalClose.addEventListener('click', closeProfileModal);
    profileModal.addEventListener('click', (e) => { if (e.target === profileModal) closeProfileModal(); });

    // Profile tabs
    function showProfileTab(tab) {
        if (tab === 'account') {
            ptabAccount.classList.add('active');
            ptabPassword.classList.remove('active');
            profileAccountForm.classList.remove('hidden');
            profilePasswordForm.classList.add('hidden');
        } else {
            ptabPassword.classList.add('active');
            ptabAccount.classList.remove('active');
            profilePasswordForm.classList.remove('hidden');
            profileAccountForm.classList.add('hidden');
        }
    }

    ptabAccount.addEventListener('click', () => showProfileTab('account'));
    ptabPassword.addEventListener('click', () => showProfileTab('password'));

    // Helper: show/hide form messages
    function showFormMsg(el, text, type) {
        el.textContent = text;
        el.className = `form-msg ${type}`;
        el.classList.remove('hidden');
    }
    function hideFormMsg(el) {
        el.classList.add('hidden');
        el.textContent = '';
    }

    // Save Account Info
    profileAccountForm.addEventListener('submit', (e) => {
        e.preventDefault();
        hideFormMsg(profileAccountMsg);

        const user = getCurrentUser();
        const newName = document.getElementById('profile-name').value.trim();
        const newEmail = document.getElementById('profile-email').value.trim().toLowerCase();

        if (!newName || !newEmail) {
            showFormMsg(profileAccountMsg, 'Please fill in all fields.', 'error'); return;
        }

        // Check if new email is taken by another user
        const users = getUsers();
        const emailTaken = users.find(u => u.email === newEmail && u.email !== user.email);
        if (emailTaken) {
            showFormMsg(profileAccountMsg, 'That email is already in use by another account.', 'error'); return;
        }

        // Update in users array
        const updatedUsers = users.map(u =>
            u.email === user.email ? { ...u, name: newName, email: newEmail } : u
        );
        localStorage.setItem('fastlib_users', JSON.stringify(updatedUsers));

        // Migrate user data if email changed
        if (newEmail !== user.email) {
            const oldData = getUserData(user.email);
            saveUserData(newEmail, oldData);
            localStorage.removeItem(`fastlib_data_${user.email}`);
        }

        const updatedUser = { ...user, name: newName, email: newEmail };
        saveCurrentUser(updatedUser);
        initAuthUI();

        // Update profile modal header live
        document.getElementById('profile-avatar-large').textContent = newName.charAt(0).toUpperCase();
        document.getElementById('profile-display-name').textContent = newName;
        document.getElementById('profile-display-email').textContent = newEmail;

        showFormMsg(profileAccountMsg, '✅ Profile updated successfully!', 'success');
        showToast('Profile updated!', 'success');
    });

    // Change Password
    profilePasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        hideFormMsg(profilePwMsg);

        const user = getCurrentUser();
        const currentPw = document.getElementById('profile-current-pw').value;
        const newPw = document.getElementById('profile-new-pw').value;
        const confirmPw = document.getElementById('profile-confirm-pw').value;

        if (currentPw !== user.password) {
            showFormMsg(profilePwMsg, 'Current password is incorrect.', 'error'); return;
        }
        if (newPw.length < 6) {
            showFormMsg(profilePwMsg, 'New password must be at least 6 characters.', 'error'); return;
        }
        if (newPw !== confirmPw) {
            showFormMsg(profilePwMsg, 'New passwords do not match.', 'error'); return;
        }

        const users = getUsers();
        const updatedUsers = users.map(u => u.email === user.email ? { ...u, password: newPw } : u);
        localStorage.setItem('fastlib_users', JSON.stringify(updatedUsers));
        saveCurrentUser({ ...user, password: newPw });
        profilePasswordForm.reset();
        showFormMsg(profilePwMsg, '✅ Password changed successfully!', 'success');
        showToast('Password updated!', 'success');
    });

    // Delete Account
    document.getElementById('delete-account-btn').addEventListener('click', () => {
        const user = getCurrentUser();
        if (!user) return;
        if (!confirm(`Are you sure you want to permanently delete your account for "${user.email}"? This cannot be undone.`)) return;

        const users = getUsers().filter(u => u.email !== user.email);
        localStorage.setItem('fastlib_users', JSON.stringify(users));
        localStorage.removeItem(`fastlib_data_${user.email}`);
        localStorage.removeItem('fastlib_current_user');
        closeProfileModal();
        initAuthUI();
        showToast('Your account has been deleted.', 'info');
    });

    // ============================
    // Library Modal
    // ============================
    function openLibraryModal(type) {
        const user = getCurrentUser();
        if (!user) { openAuthModal(); return; }

        const data = getUserData(user.email);
        const items = type === 'borrowed' ? data.borrowed : data.waitlist;
        libraryModalTitle.textContent = type === 'borrowed' ? '📚 My Borrowed Books' : '🔔 My Waitlist';

        libraryModalContent.innerHTML = '';
        if (items.length === 0) {
            libraryModalContent.innerHTML = `
                <div class="library-empty">
                    <div class="library-empty-icon">${type === 'borrowed' ? '📖' : '🔔'}</div>
                    <p>${type === 'borrowed' ? "You haven't borrowed any books yet." : "Your waitlist is empty."}</p>
                </div>`;
        } else {
            items.forEach(book => {
                const item = document.createElement('div');
                item.className = 'library-item';
                const [c1, c2] = book.coverGradient || ['#1e3a5f', '#3b82f6'];
                item.innerHTML = `
                    <div class="library-item-icon" style="background: linear-gradient(135deg, ${c1}, ${c2})">📚</div>
                    <div class="library-item-info">
                        <div class="library-item-title">${book.title}</div>
                        <div class="library-item-author">by ${book.author}</div>
                    </div>
                    <span class="library-item-status ${type}">${type === 'borrowed' ? 'Borrowed' : 'On waitlist'}</span>
                `;
                libraryModalContent.appendChild(item);
            });
        }

        libraryModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    libraryModalClose.addEventListener('click', () => {
        libraryModal.classList.add('hidden');
        document.body.style.overflow = '';
    });
    libraryModal.addEventListener('click', (e) => {
        if (e.target === libraryModal) {
            libraryModal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    });

    // ============================
    // Smooth Scroll / Nav
    // ============================
    document.getElementById('logo-home').addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', (e) => {
            const href = a.getAttribute('href');
            if (href === '#' || href === '') return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ============================
    // Toast Notifications
    // ============================
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

    // ============================
    // Enriched Mock Data
    // ============================
    const mockBooks = [
        { id: 1, title: "The Great Gatsby", author: "F. Scott Fitzgerald", genre: "Classic", description: "A tale of wealth, love, and the American Dream set in the Jazz Age. Jay Gatsby's obsessive pursuit of Daisy Buchanan unfolds against the backdrop of 1920s Long Island excess.", coverGradient: ["#1e3a5f", "#4a90d9"], branches: [{ name: "Central Library", copies: 3 }, { name: "Westside Branch", copies: 2 }, { name: "Downtown Hub", copies: 0 }] },
        { id: 2, title: "The Silent Patient", author: "Alex Michaelides", genre: "Thriller", description: "Alicia Berenson's life seems perfect until she shoots her husband and never speaks again. Theo Faber, a criminal psychotherapist, becomes obsessed with uncovering her motive.", coverGradient: ["#2d1b4e", "#7c3aed"], branches: [{ name: "Central Library", copies: 1 }, { name: "Eastside Branch", copies: 2 }, { name: "Downtown Hub", copies: 0 }] },
        { id: 3, title: "Atomic Habits", author: "James Clear", genre: "Self-Help", description: "A revolutionary guide to building good habits and breaking bad ones. Clear reveals practical strategies based on biology, psychology, and neuroscience to make lasting change.", coverGradient: ["#065f46", "#10b981"], branches: [{ name: "Central Library", copies: 5 }, { name: "Westside Branch", copies: 3 }, { name: "Eastside Branch", copies: 2 }] },
        { id: 4, title: "Dune", author: "Frank Herbert", genre: "Sci-Fi", description: "Set on the desert planet Arrakis, this epic follows Paul Atreides as he navigates political intrigue, ecological challenges, and his destiny as a prophesied leader.", coverGradient: ["#92400e", "#f59e0b"], branches: [{ name: "Downtown Hub", copies: 2 }, { name: "Central Library", copies: 0 }, { name: "Westside Branch", copies: 0 }] },
        { id: 5, title: "Project Hail Mary", author: "Andy Weir", genre: "Sci-Fi", description: "Ryland Grace awakens alone on a spaceship with no memory. Humanity's last hope, he must solve an extinction-level threat with an unlikely alien companion.", coverGradient: ["#1e1b4b", "#6366f1"], branches: [{ name: "Central Library", copies: 2 }, { name: "Eastside Branch", copies: 2 }, { name: "Downtown Hub", copies: 0 }] },
        { id: 6, title: "Where the Crawdads Sing", author: "Delia Owens", genre: "Fiction", description: "Kya Clark, the 'Marsh Girl' of a North Carolina coastal town, is drawn into a murder investigation. A story of resilience, loneliness, and the beauty of nature.", coverGradient: ["#064e3b", "#34d399"], branches: [{ name: "Central Library", copies: 3 }, { name: "Westside Branch", copies: 2 }, { name: "Eastside Branch", copies: 1 }] },
        { id: 7, title: "The Midnight Library", author: "Matt Haig", genre: "Contemporary", description: "Between life and death, Nora Seed discovers a library containing books of every life she could have lived. Each book offers a chance to explore a different path.", coverGradient: ["#312e81", "#818cf8"], branches: [{ name: "Central Library", copies: 4 }, { name: "Downtown Hub", copies: 2 }, { name: "Westside Branch", copies: 2 }] },
        { id: 8, title: "Deep Work", author: "Cal Newport", genre: "Education", description: "In a world of constant distraction, Newport argues that the ability to focus deeply is becoming increasingly rare — and increasingly valuable.", coverGradient: ["#0c4a6e", "#0ea5e9"], branches: [{ name: "Central Library", copies: 5 }, { name: "Eastside Branch", copies: 4 }, { name: "Downtown Hub", copies: 3 }] },
        { id: 9, title: "Clean Code", author: "Robert C. Martin", genre: "Programming", description: "A handbook of agile software craftsmanship. Learn to write code that is clean, readable, and maintainable through real-world examples and expert guidance.", coverGradient: ["#1a1a2e", "#475569"], branches: [{ name: "Central Library", copies: 3 }, { name: "Downtown Hub", copies: 2 }, { name: "Eastside Branch", copies: 2 }] },
        { id: 10, title: "Educated", author: "Tara Westover", genre: "Memoir", description: "Born to survivalists, Tara Westover never attended school. Through sheer determination, she taught herself and eventually earned a PhD from Cambridge University.", coverGradient: ["#78350f", "#d97706"], branches: [{ name: "Central Library", copies: 0 }, { name: "Westside Branch", copies: 0 }, { name: "Downtown Hub", copies: 0 }] },
        { id: 11, title: "Harry Potter and the Sorcerer's Stone", author: "J.K. Rowling", genre: "Fantasy", description: "An orphaned boy discovers he's a wizard and enters Hogwarts School of Witchcraft and Wizardry, where he uncovers the truth about his parents and a dark sorcerer.", coverGradient: ["#4a1a6b", "#9333ea"], branches: [{ name: "Central Library", copies: 6 }, { name: "Westside Branch", copies: 5 }, { name: "Downtown Hub", copies: 4 }] },
        { id: 12, title: "Haruki Murakami Selection", author: "Haruki Murakami", genre: "Fiction", description: "A curated anthology of Murakami's finest short stories, blending magical realism with deep introspection on loneliness, music, and the surreal nature of everyday life.", coverGradient: ["#831843", "#ec4899"], branches: [{ name: "Central Library", copies: 2 }, { name: "Eastside Branch", copies: 2 }, { name: "Downtown Hub", copies: 0 }] },
        { id: 13, title: "Harmony of the Spheres", author: "Various Authors", genre: "Musicology", description: "An exploration of the mathematical and philosophical connections between music and the cosmos, from Pythagoras through modern astrophysics.", coverGradient: ["#1e293b", "#64748b"], branches: [{ name: "Central Library", copies: 0 }, { name: "Eastside Branch", copies: 0 }] }
    ];

    // ============================
    // Search Logic
    // ============================
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== searchInput) {
            e.preventDefault(); searchInput.focus();
        }
        if (e.key === 'Escape') {
            closeBookModal();
            closeAuthModal();
            if (document.getElementById('profile-modal')) {
                document.getElementById('profile-modal').classList.add('hidden');
            }
            libraryModal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    });

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    async function fetchSuggestions(query) {
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error('fail');
            const apiResults = await res.json();
            return apiResults.map(r => mockBooks.find(m => m.title === r.title) || { ...r, coverGradient: ['#1e3a5f','#3b82f6'], branches: [{ name: 'Main Branch', copies: r.available_copies || 0 }] });
        } catch {
            const q = query.toLowerCase();
            return mockBooks.filter(b =>
                b.title.toLowerCase().startsWith(q) ||
                b.author.toLowerCase().startsWith(q) ||
                b.title.toLowerCase().includes(q) ||
                b.author.toLowerCase().includes(q)
            ).slice(0, 6);
        }
    }

    function hl(text, q) {
        if (!q) return text;
        const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.replace(new RegExp(`(${esc})`, 'gi'), '<span class="suggestion-highlight">$1</span>');
    }

    function renderSuggestions(results, query) {
        searchResults.innerHTML = '';
        if (!results.length) {
            searchResults.innerHTML = `<div class="no-results">No results found for "${query}"</div>`;
            return;
        }
        results.forEach(book => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `
                <div class="suggestion-icon">📚</div>
                <div class="suggestion-info">
                    <div class="suggestion-title">${hl(book.title, query)}</div>
                    <div class="suggestion-author">${hl(book.author, query)}</div>
                </div>
                <span class="genre-badge">${book.genre}</span>`;
            div.addEventListener('click', () => {
                searchResults.classList.add('hidden');
                searchInput.value = book.title;
                openBookModal(book);
            });
            searchResults.appendChild(div);
        });
    }

    const handleSearch = debounce(async (e) => {
        const q = e.target.value.trim();
        if (q.length < 2) { searchResults.classList.add('hidden'); return; }
        const results = await fetchSuggestions(q);
        renderSuggestions(results, q);
        searchResults.classList.remove('hidden');
    }, 200);

    searchInput.addEventListener('input', handleSearch);
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) searchResults.classList.add('hidden');
    });
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim().length >= 2 && searchResults.children.length > 0) searchResults.classList.remove('hidden');
    });

    // ============================
    // Book Detail Modal
    // ============================
    function openBookModal(book) {
        const coverEl = document.getElementById('book-cover');
        const [c1, c2] = book.coverGradient || ['#1e3a5f', '#3b82f6'];
        coverEl.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;

        document.getElementById('book-title').textContent = book.title;
        document.getElementById('book-author').textContent = `by ${book.author}`;
        document.getElementById('book-genre-badge').textContent = book.genre;
        document.getElementById('book-description').textContent = book.description || 'A compelling read from our collection.';

        const branchList = document.getElementById('branch-list');
        branchList.innerHTML = '';
        const branches = book.branches || [{ name: 'Main Branch', copies: book.available_copies || 0 }];
        branches.forEach(b => {
            const item = document.createElement('div');
            item.className = 'branch-item';
            item.innerHTML = `
                <span class="branch-name">${b.name}</span>
                <span class="branch-copies ${b.copies > 0 ? 'available' : 'unavailable'}">${b.copies > 0 ? `${b.copies} available` : 'Unavailable'}</span>`;
            branchList.appendChild(item);
        });

        const actionsEl = document.getElementById('book-actions');
        actionsEl.innerHTML = '';
        const totalCopies = branches.reduce((s, b) => s + b.copies, 0);

        if (totalCopies > 0) {
            const btn = document.createElement('button');
            btn.className = 'btn-borrow';
            btn.textContent = '📖 Borrow This Book';
            btn.addEventListener('click', () => handleBorrow(book));
            actionsEl.appendChild(btn);
        } else {
            const btn = document.createElement('button');
            btn.className = 'btn-waitlist';
            btn.textContent = '🔔 Join Waitlist';
            btn.addEventListener('click', () => handleWaitlist(book));
            actionsEl.appendChild(btn);
        }

        bookModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeBookModal() {
        bookModal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    bookModalClose.addEventListener('click', closeBookModal);
    bookModal.addEventListener('click', (e) => { if (e.target === bookModal) closeBookModal(); });

    // ============================
    // Borrow & Waitlist w/ Auth
    // ============================
    function handleBorrow(book) {
        const user = getCurrentUser();
        if (!user) {
            closeBookModal();
            openAuthModal('signin');
            showToast('Please sign in to borrow books.', 'warning');
            return;
        }

        const data = getUserData(user.email);
        if (data.borrowed.find(b => b.id === book.id)) {
            showToast(`You've already borrowed "${book.title}"!`, 'warning');
            return;
        }
        data.borrowed.push({ id: book.id, title: book.title, author: book.author, coverGradient: book.coverGradient });
        saveUserData(user.email, data);
        closeBookModal();
        showToast(`"${book.title}" reserved! 📚 Pick it up at your nearest branch.`, 'success');
    }

    function handleWaitlist(book) {
        const user = getCurrentUser();
        if (!user) {
            closeBookModal();
            openAuthModal('signin');
            showToast('Please sign in to join the waitlist.', 'warning');
            return;
        }

        const data = getUserData(user.email);
        if (data.waitlist.find(b => b.id === book.id)) {
            showToast(`You're already on the waitlist for "${book.title}".`, 'warning');
            return;
        }
        data.waitlist.push({ id: book.id, title: book.title, author: book.author, coverGradient: book.coverGradient });
        saveUserData(user.email, data);
        closeBookModal();
        showToast(`Added to waitlist for "${book.title}" 🔔 We'll notify you when it's available!`, 'success');
    }

    // ============================
    // Stat Card Count-up
    // ============================
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.dataset.animated) {
                entry.target.dataset.animated = 'true';
                const el = entry.target.querySelector('.stat-value');
                const original = el.innerHTML;
                const num = parseFloat(original.replace(/[^0-9.]/g, ''));
                let start = null;
                const step = (ts) => {
                    if (!start) start = ts;
                    const prog = Math.min((ts - start) / 1500, 1);
                    const cur = prog * num;
                    if (original.includes('<')) el.innerHTML = `&lt;${cur.toFixed(0)}ms`;
                    else if (original.includes('%')) el.innerHTML = `${cur.toFixed(0)}%`;
                    else el.innerHTML = `${cur.toFixed(0)}K+`;
                    if (prog < 1) requestAnimationFrame(step);
                    else el.innerHTML = original;
                };
                requestAnimationFrame(step);
            }
        });
    }, { threshold: 0.3 });

    statCards.forEach(c => observer.observe(c));
});
