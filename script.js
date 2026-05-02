document.addEventListener('DOMContentLoaded', () => {

    // ============================
    // State & DOM References
    // ============================
    const searchInput = document.getElementById('main-search');
    const searchResults = document.getElementById('search-results');
    const statCards = document.querySelectorAll('.stat-card');

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    const iconSun = themeToggle.querySelector('.icon-sun');
    const iconMoon = themeToggle.querySelector('.icon-moon');
    
    // Check saved theme
    const savedTheme = localStorage.getItem('fastlib_theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        iconSun.classList.add('hidden');
        iconMoon.classList.remove('hidden');
    }

    themeToggle.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('fastlib_theme', 'light');
            iconSun.classList.remove('hidden');
            iconMoon.classList.add('hidden');
        } else {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('fastlib_theme', 'dark');
            iconSun.classList.add('hidden');
            iconMoon.classList.remove('hidden');
        }
    });

    // ============================
    // Tab Navigation Logic
    // ============================
    const navLinks = document.querySelectorAll('.nav-links-center .nav-link');
    const tabViews = document.querySelectorAll('.tab-view');

    function switchTab(hash) {
        // Normalize hash
        if (!hash || hash === '#' || hash === '#home') {
            hash = '#home';
        }
        
        // Update nav links active state
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === hash) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Show correct view
        const targetViewId = hash.substring(1) + '-view';
        tabViews.forEach(view => {
            if (view.id === targetViewId) {
                view.classList.remove('hidden');
            } else {
                view.classList.add('hidden');
            }
        });

        // Scroll to top for better UX
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Trigger data fetch if needed
        if (hash === '#books') fetchBooksTab();
        if (hash === '#genres') fetchGenresTab();
        if (hash === '#authors') fetchAuthorsTab();
        if (hash === '#poetry') fetchPoetryTab();
    }

    // Handle hash change
    window.addEventListener('hashchange', () => switchTab(window.location.hash));
    
    // Explicit click handling for nav links to handle clicks on the same tab
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href.startsWith('#')) {
                // If already on this hash, manually trigger switchTab for the scrolling/sync effect
                if (window.location.hash === href) {
                    switchTab(href);
                }
            }
        });
    });

    // Logo click
    const logoHome = document.getElementById('logo-home');
    if (logoHome) {
        logoHome.addEventListener('click', () => {
            if (window.location.hash === '#home') {
                switchTab('#home');
            } else {
                window.location.hash = '#home';
            }
        });
    }
    
    // Initial load
    switchTab(window.location.hash);

    // ============================
    // Fetch Data for Tabs
    // ============================
    async function fetchPoetryTab() {
        const feed = document.getElementById('poetry-feed');
        try {
            const res = await fetch('/api/poetry');
            const poems = await res.json();
            feed.innerHTML = '';
            if (poems.length === 0) {
                feed.innerHTML = '<div class="loading-state">Be the first to share a poem!</div>';
                return;
            }
            poems.forEach(poem => {
                const div = document.createElement('div');
                div.className = `poem-card ${poem.isExternal ? 'classic' : 'community'}`;
                
                const likesCount = poem.likes || 0;
                const comments = poem.comments || [];
                
                let commentsHtml = '<div class="poem-comments-list">';
                comments.forEach(c => {
                    commentsHtml += `<div class="poem-comment"><strong>${c.user}</strong>: ${c.text} <span class="comment-date">${c.date}</span></div>`;
                });
                commentsHtml += '</div>';

                div.innerHTML = `
                    <div class="poem-header-row">
                        <span class="poem-badge ${poem.isExternal ? 'badge-classic' : 'badge-community'}">
                            ${poem.isExternal ? '📜 Classic' : '✨ Community'}
                        </span>
                        <div class="poem-date">${poem.date}</div>
                    </div>
                    <div class="poem-header">
                        <h3 class="poem-title">${poem.title}</h3>
                        <div class="poem-author">by ${poem.author}</div>
                    </div>
                    <div class="poem-content">${poem.content}</div>
                    <div class="poem-footer">
                        <div class="poem-decor">🖋️</div>
                        <div class="poem-actions">
                            <button class="btn-like-poem" data-id="${poem.id}">❤️ <span class="like-count">${likesCount}</span></button>
                            <button class="btn-comment-toggle">💬 ${comments.length}</button>
                        </div>
                    </div>
                    <div class="poem-comments-section hidden">
                        ${commentsHtml}
                        <form class="poem-comment-form" data-id="${poem.id}">
                            <input type="text" placeholder="Add a comment..." required class="comment-input" />
                            <button type="submit" class="btn-submit-comment">Post</button>
                        </form>
                    </div>
                `;
                
                // Add event listeners
                const likeBtn = div.querySelector('.btn-like-poem');
                const commentToggle = div.querySelector('.btn-comment-toggle');
                const commentSection = div.querySelector('.poem-comments-section');
                const commentForm = div.querySelector('.poem-comment-form');

                likeBtn.addEventListener('click', async () => {
                    try {
                        const res = await fetch(`/api/poetry/${poem.id}/like`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ poem })
                        });
                        if (res.ok) {
                            const updated = await res.json();
                            likeBtn.querySelector('.like-count').textContent = updated.likes;
                            poem.likes = updated.likes;
                            likeBtn.classList.add('liked');
                        }
                    } catch (e) { console.error('Error liking poem:', e); }
                });

                commentToggle.addEventListener('click', () => {
                    commentSection.classList.toggle('hidden');
                });

                commentForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const input = commentForm.querySelector('.comment-input');
                    const text = input.value.trim();
                    if (!text) return;

                    const userObj = getCurrentUser();
                    const user = userObj ? userObj.name : 'Guest';

                    try {
                        const res = await fetch(`/api/poetry/${poem.id}/comment`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text, user, poemData: poem })
                        });
                        if (res.ok) {
                            fetchPoetryTab();
                        }
                    } catch (e) { console.error('Error commenting:', e); }
                });

                feed.appendChild(div);
            });
        } catch (e) {
            feed.innerHTML = '<div class="loading-state">Failed to load poems.</div>';
        }
    }

    // Poem Form Logic
    const poemForm = document.getElementById('poem-form');
    if (poemForm) {
        poemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = poemForm.querySelector('button');
            const title = document.getElementById('poem-title').value;
            const author = document.getElementById('poem-author').value;
            const content = document.getElementById('poem-content').value;

            btn.disabled = true;
            btn.textContent = 'Sharing...';

            try {
                const res = await fetch('/api/poetry', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, author, content })
                });
                if (res.ok) {
                    showToast('Your poem has been shared! ✨', 'success');
                    poemForm.reset();
                    fetchPoetryTab();
                } else {
                    showToast('Failed to share poem. Please try again.', 'error');
                }
            } catch (err) {
                showToast('Server error. Please try again later.', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = '✨ Share with Community';
            }
        });
    }

    async function fetchBooksTab() {
        const container = document.getElementById('books-container');
        if (container.dataset.loaded) return; // Prevent refetching
        try {
            const res = await fetch('/api/books');
            const books = await res.json();
            container.innerHTML = '';
            books.forEach(book => {
                const div = document.createElement('div');
                div.className = 'book-card';
                div.innerHTML = `
                    <div class="book-cover">
                        ${book.coverImage ? `<img src="${book.coverImage}" alt="Cover">` : `
                        <div class="book-placeholder">
                            <span class="icon">📚</span>
                            <span class="genre">${book.genre}</span>
                        </div>`}
                    </div>
                    <div class="book-info">
                        <h3 class="book-title">${book.title}</h3>
                        <p class="book-author">${book.author}</p>
                    </div>
                `;
                book.source = 'google';
                div.addEventListener('click', () => openBookModal(book));
                container.appendChild(div);
            });
            container.dataset.loaded = "true";
        } catch (e) {
            container.innerHTML = '<div class="loading-state">Failed to load books.</div>';
        }
    }

    async function fetchGenresTab() {
        const container = document.getElementById('genres-container');
        if (container.dataset.loaded) return;
        try {
            const res = await fetch('/api/genres');
            const genres = await res.json();
            container.innerHTML = '';
            genres.forEach(genre => {
                const div = document.createElement('div');
                div.className = 'genre-card-large';
                div.innerHTML = `
                    <h3 class="genre-title-large">${genre.genre}</h3>
                    <p class="genre-count-large">${genre.count} books</p>
                `;
                div.addEventListener('click', () => {
                    window.location.hash = '#books';
                    const subjectQuery = genre.genre.toLowerCase() === 'non-fiction' ? 'nonfiction' : genre.genre;
                    fetchBooksByQuery(`subject:${subjectQuery}`);
                });
                container.appendChild(div);
            });
            container.dataset.loaded = "true";
        } catch (e) {
            container.innerHTML = '<div class="loading-state">Failed to load genres.</div>';
        }
    }

    async function fetchAuthorsTab() {
        const container = document.getElementById('authors-container');
        if (container.dataset.loaded) return;
        try {
            const res = await fetch('/api/authors');
            const authors = await res.json();
            container.innerHTML = '';
            authors.forEach(author => {
                const div = document.createElement('div');
                div.className = 'author-card';
                div.innerHTML = `
                    <h3 class="author-name">${author.author}</h3>
                    <p class="author-count">${author.count} books</p>
                `;
                div.addEventListener('click', () => {
                    window.location.hash = '#books';
                    fetchBooksByQuery(`inauthor:"${author.author}"`);
                });
                container.appendChild(div);
            });
            container.dataset.loaded = "true";
        } catch (e) {
            container.innerHTML = '<div class="loading-state">Failed to load authors.</div>';
        }
    }

    async function fetchBooksByQuery(query, limit = 40) {
        const container = document.getElementById('books-container');
        container.innerHTML = '<div class="loading-state">Loading books from Google...</div>';
        try {
            const res = await fetch(`/api/books/google?q=${encodeURIComponent(query)}&limit=${limit}`);
            const books = await res.json();
            container.innerHTML = '';
            if (books.length === 0) {
                container.innerHTML = '<div class="loading-state">No books found.</div>';
                return;
            }
            books.forEach(book => {
                const div = document.createElement('div');
                div.className = 'book-card';
                div.innerHTML = `
                    <div class="book-cover">
                        ${book.coverImage ? `<img src="${book.coverImage}" alt="Cover">` : `
                        <div class="book-placeholder">
                            <span class="icon">📚</span>
                            <span class="genre">${book.genre}</span>
                        </div>`}
                    </div>
                    <div class="book-info">
                        <h3 class="book-title">${book.title}</h3>
                        <p class="book-author">${book.author}</p>
                    </div>
                `;
                book.source = 'google';
                div.addEventListener('click', () => openBookModal(book));
                container.appendChild(div);
            });
        } catch (e) {
            container.innerHTML = '<div class="loading-state">Failed to load books.</div>';
        }
    }

    // Curated Collections Click Handlers
    const setupCollectionHandler = (id, query) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', () => {
                window.location.hash = '#books';
                fetchBooksByQuery(query, 40);
            });
        }
    };
    setupCollectionHandler('collection-awards', 'pulitzer winner OR booker prize');
    setupCollectionHandler('collection-nyt', 'new york times bestseller');
    setupCollectionHandler('collection-mind', 'science philosophy');
    setupCollectionHandler('collection-staff', 'bestselling fiction 2024');

    // Home Page Categories Click Handlers
    setupCollectionHandler('cat-fiction', 'subject:fiction');
    setupCollectionHandler('cat-nonfiction', 'subject:nonfiction');
    setupCollectionHandler('cat-science', 'science technology');
    setupCollectionHandler('cat-selfhelp', 'self-help personal growth');
    setupCollectionHandler('cat-history', 'history biography');
    
    const catMore = document.getElementById('cat-more');
    if (catMore) {
        catMore.addEventListener('click', () => {
            window.location.hash = '#genres';
        });
    }

    const btnBanner = document.querySelector('.btn-banner');
    if (btnBanner) {
        btnBanner.addEventListener('click', () => {
            window.location.hash = '#books';
        });
    }

    const footerSignin = document.getElementById('footer-signin');
    if (footerSignin) {
        footerSignin.addEventListener('click', (e) => {
            e.preventDefault();
            openAuthModal('signin');
        });
    }

    // Trending Tags Click Handlers
    document.querySelectorAll('.trending-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            const query = tag.textContent.trim();
            window.location.hash = '#books';
            fetchBooksByQuery(query, 40);
        });
        // Make them look clickable
        tag.style.cursor = 'pointer';
    });

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
    const signinView = document.getElementById('signin-view');
    const registerView = document.getElementById('register-view');
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
        const data = JSON.parse(localStorage.getItem(key) || '{"borrowed":[],"waitlist":[],"history":[]}');
        if (!data.history) data.history = [];
        return data;
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
            signinView.classList.remove('hidden');
            registerView.classList.add('hidden');
        } else {
            registerView.classList.remove('hidden');
            signinView.classList.add('hidden');
        }
    }

    document.getElementById('switch-to-register').addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('register'); });
    document.getElementById('switch-to-signin').addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('signin'); });

    // Password Toggle functionality
    document.querySelectorAll('.pw-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = '🙈';
            } else {
                input.type = 'password';
                btn.textContent = '👁️';
            }
        });
    });

    // Real Google Identity Services Callback
    window.handleGoogleCredentialResponse = (response) => {
        // Decode JWT token
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);
        
        // Payload contains real Google user data
        const googleUser = {
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
            password: 'google_oauth_user_' + payload.sub // Placeholder password for local state
        };

        const users = getUsers();
        if (!users.find(u => u.email === googleUser.email)) {
            users.push(googleUser);
            localStorage.setItem('fastlib_users', JSON.stringify(users));
        }
        saveCurrentUser(googleUser);
        initAuthUI();
        closeAuthModal();
        showToast('Signed in with Google! 🎉', 'success');
    };

    // Wire up custom Google buttons
    function handleGoogleBtnClick() {
        // Check if Google Identity Services is loaded and client ID is configured
        if (window.google && window.google.accounts && window.google.accounts.id) {
            google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    // One Tap was blocked — inform the user
                    showToast('Please ensure a valid Google Client ID is set up in Google Cloud Console.', 'error');
                }
            });
        } else {
            showToast('Google Sign-In is not configured yet. Please set up a valid Client ID in Google Cloud Console.', 'error');
        }
    }

    const googleSigninBtn = document.getElementById('google-signin-btn');
    const googleRegisterBtn = document.getElementById('google-register-btn');
    if (googleSigninBtn) googleSigninBtn.addEventListener('click', handleGoogleBtnClick);
    if (googleRegisterBtn) googleRegisterBtn.addEventListener('click', handleGoogleBtnClick);
    document.getElementById('switch-to-register').addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('register'); });
    document.getElementById('switch-to-signin').addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('signin'); });

    // ============================
    // Sign In
    // ============================
    signinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signin-email').value.trim().toLowerCase();
        const password = document.getElementById('signin-password').value;
        const submitBtn = signinForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';
        try {
            const res = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) {
                signinError.textContent = data.error || 'Sign-in failed.';
                signinError.classList.remove('hidden');
                return;
            }
            saveCurrentUser(data.user);
            initAuthUI();
            closeAuthModal();
            showToast(`Welcome back, ${data.user.name.split(' ')[0]}! 👋`, 'success');
        } catch (err) {
            signinError.textContent = 'Server error. Please try again.';
            signinError.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
    });

    // ============================
    // Register
    // ============================
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim().toLowerCase();
        const password = document.getElementById('reg-password').value;
        const submitBtn = registerForm.querySelector('button[type="submit"]');

        if (password.length < 6) {
            registerError.textContent = 'Password must be at least 6 characters.';
            registerError.classList.remove('hidden');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json();
            if (!res.ok) {
                registerError.textContent = data.error || 'Registration failed.';
                registerError.classList.remove('hidden');
                return;
            }
            saveCurrentUser(data.user);
            initAuthUI();
            closeAuthModal();
            showToast(`Account created! Welcome to FastLib, ${name.split(' ')[0]}! 🎉`, 'success');
        } catch (err) {
            registerError.textContent = 'Server error. Please try again.';
            registerError.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
        }
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
        window.location.href = '/dashboard.html';
    });

    document.getElementById('waitlist-link').addEventListener('click', (e) => {
        e.preventDefault();
        userDropdown.classList.add('hidden');
        window.location.href = '/dashboard.html#waitlist';
    });

    document.getElementById('profile-link').addEventListener('click', (e) => {
    e.preventDefault();
    userDropdown.classList.add('hidden');
    window.location.href = 'profile.html';
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
                const coverHtml = book.coverImage 
                    ? `<div class="library-item-icon"><img src="${book.coverImage}" alt="${book.title}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;"></div>`
                    : `<div class="library-item-icon" style="background: linear-gradient(135deg, ${c1}, ${c2})">📚</div>`;
                item.innerHTML = `
                    ${coverHtml}
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
    // Logo-home is already handled in the header section of this script

    document.querySelectorAll('a[href^="#"]:not(.nav-link)').forEach(a => {
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
        { id: 13, title: "Harmony of the Spheres", author: "Various Authors", genre: "Musicology", description: "An exploration of the mathematical and philosophical connections between music and the cosmos, from Pythagoras through modern astrophysics.", coverGradient: ["#1e293b", "#64748b"], branches: [{ name: "Central Library", copies: 0 }, { name: "Eastside Branch", copies: 0 }] },
        { id: 14, title: "The Psychology of Money", author: "Morgan Housel", genre: "Finance", description: "Timeless lessons on wealth, greed, and happiness. Housel shares 19 short stories exploring the strange ways people think about money and teaches you how to make better sense of one of life's most important topics.", coverImage: "https://covers.openlibrary.org/b/isbn/9780857197689-L.jpg", branches: [{ name: "Central Library", copies: 5 }, { name: "Eastside Branch", copies: 3 }, { name: "Downtown Hub", copies: 2 }] }
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
        // Fetch from both local and Google Books in parallel
        const localPromise = (async () => {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                if (!res.ok) throw new Error('fail');
                const apiResults = await res.json();
                return apiResults.map(r => mockBooks.find(m => m.title === r.title) || { ...r, coverGradient: ['#1e3a5f','#3b82f6'], branches: [{ name: 'Main Branch', copies: r.available_copies || 0 }], source: 'local' });
            } catch {
                const q = query.toLowerCase();
                return mockBooks.filter(b =>
                    b.title.toLowerCase().startsWith(q) ||
                    b.author.toLowerCase().startsWith(q) ||
                    b.title.toLowerCase().includes(q) ||
                    b.author.toLowerCase().includes(q)
                ).slice(0, 6).map(b => ({ ...b, source: 'local' }));
            }
        })();

        const googlePromise = (async () => {
            try {
                const res = await fetch(`/api/books/google?q=${encodeURIComponent(query)}`);
                if (!res.ok) throw new Error('fail');
                return await res.json();
            } catch {
                return [];
            }
        })();

        const [localResults, googleResults] = await Promise.all([localPromise, googlePromise]);

        // Merge: local first, then Google Books (deduplicate by title)
        const seenTitles = new Set(localResults.map(b => b.title.toLowerCase()));
        const uniqueGoogle = googleResults.filter(b => !seenTitles.has(b.title.toLowerCase()));
        const merged = [...localResults, ...uniqueGoogle].slice(0, 8);
        return merged;
    }

    function hl(text, q) {
        if (!q) return text;
        const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.replace(new RegExp(`(${esc})`, 'gi'), '<span class="suggestion-highlight">$1</span>');
    }

    let selectedIndex = -1;

    function renderPopularSearches() {
        searchResults.innerHTML = `
            <div class="popular-header">Popular Searches</div>
            <div class="suggestion-item"><div class="suggestion-icon">📈</div><div class="suggestion-info"><div class="suggestion-title">Atomic Habits</div><div class="suggestion-author">James Clear</div></div><span class="genre-badge">Self-Help</span></div>
            <div class="suggestion-item"><div class="suggestion-icon">📈</div><div class="suggestion-info"><div class="suggestion-title">Dune</div><div class="suggestion-author">Frank Herbert</div></div><span class="genre-badge">Sci-Fi</span></div>
            <div class="suggestion-item"><div class="suggestion-icon">📈</div><div class="suggestion-info"><div class="suggestion-title">The Midnight Library</div><div class="suggestion-author">Matt Haig</div></div><span class="genre-badge">Contemporary</span></div>
        `;
        Array.from(searchResults.querySelectorAll('.suggestion-item')).forEach((div, i) => {
            const title = div.querySelector('.suggestion-title').textContent;
            div.addEventListener('click', () => {
                searchResults.classList.add('hidden');
                searchInput.value = title;
                const book = mockBooks.find(b => b.title === title);
                if (book) openBookModal(book);
            });
        });
        selectedIndex = -1;
    }

    function renderSuggestions(results, query) {
        searchResults.innerHTML = '';
        selectedIndex = -1;
        if (!results.length) {
            searchResults.innerHTML = `<div class="no-results">No results found for "${query}"</div>`;
            return;
        }
        results.forEach((book, index) => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.dataset.index = index;

            // Cover thumbnail: use real cover image for Google Books, emoji for local
            const coverHtml = book.coverImage
                ? `<div class="suggestion-cover"><img src="${book.coverImage}" alt="${book.title}" loading="lazy"></div>`
                : `<div class="suggestion-icon">📚</div>`;

            // Source badge
            const sourceBadge = book.source === 'google'
                ? `<span class="source-badge google">Google Books</span>`
                : `<span class="source-badge local">Library</span>`;

            // Star rating for Google Books
            const ratingHtml = book.rating
                ? `<span class="suggestion-rating">⭐ ${book.rating}</span>`
                : '';

            div.innerHTML = `
                ${coverHtml}
                <div class="suggestion-info">
                    <div class="suggestion-title">${hl(book.title, query)}</div>
                    <div class="suggestion-author">${hl(book.author, query)} ${ratingHtml}</div>
                </div>
                <div class="suggestion-meta">
                    <span class="genre-badge">${book.genre || 'General'}</span>
                    ${sourceBadge}
                </div>`;
            div.addEventListener('click', () => {
                searchResults.classList.add('hidden');
                searchInput.value = book.title;
                openBookModal(book);
            });
            // Hover updates selected index
            div.addEventListener('mouseenter', () => {
                updateSelection(index);
            });
            searchResults.appendChild(div);
        });
    }

    function updateSelection(index) {
        const items = searchResults.querySelectorAll('.suggestion-item');
        if (!items.length) return;
        items.forEach(el => el.classList.remove('selected'));
        if (index >= 0 && index < items.length) {
            items[index].classList.add('selected');
            selectedIndex = index;
            // Ensure visible in scroll if needed
            items[index].scrollIntoView({ block: 'nearest' });
        } else {
            selectedIndex = -1;
        }
    }

    const handleSearch = debounce(async (e) => {
        const q = e.target.value.trim();
        if (q.length === 0) { 
            renderPopularSearches();
            searchResults.classList.remove('hidden');
            return; 
        }
        if (q.length < 2) { 
            searchResults.classList.add('hidden'); 
            return; 
        }
        const results = await fetchSuggestions(q);
        renderSuggestions(results, q);
        searchResults.classList.remove('hidden');
    }, 100);

    searchInput.addEventListener('input', handleSearch);
    
    // Keyboard navigation
    searchInput.addEventListener('keydown', (e) => {
        const items = searchResults.querySelectorAll('.suggestion-item');
        if (searchResults.classList.contains('hidden') || !items.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            updateSelection(selectedIndex + 1 >= items.length ? 0 : selectedIndex + 1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            updateSelection(selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0) {
                items[selectedIndex].click();
            } else if (items.length > 0) {
                items[0].click(); // Default to first if none selected
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) searchResults.classList.add('hidden');
    });
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim().length === 0) {
            renderPopularSearches();
            searchResults.classList.remove('hidden');
        } else if (searchInput.value.trim().length >= 2 && searchResults.children.length > 0) {
            searchResults.classList.remove('hidden');
        }
    });

    // Full Search Action (Search Button or Enter)
    const performFullSearch = () => {
        const query = searchInput.value.trim();
        if (query.length < 2) {
            showToast('Please enter at least 2 characters.', 'info');
            return;
        }
        searchResults.classList.add('hidden');
        window.location.hash = '#books';
        fetchBooksByQuery(query, 40);
    };

    const searchBtn = document.querySelector('.btn-search');
    if (searchBtn) {
        searchBtn.addEventListener('click', performFullSearch);
    }

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && selectedIndex === -1) {
            performFullSearch();
        }
    });

    // ============================
    // Book Detail Modal
    // ============================
    function openBookModal(book) {
        const coverEl = document.getElementById('book-cover');
        const coverIcon = coverEl.querySelector('.cover-icon');
        
        // Remove any previous cover image
        const existingImg = coverEl.querySelector('.cover-img');
        if (existingImg) existingImg.remove();

        if (book.coverImage) {
            // Google Books: show real cover image
            coverEl.style.background = 'linear-gradient(135deg, #0f172a, #1e293b)';
            if (coverIcon) coverIcon.style.display = 'none';
            const img = document.createElement('img');
            img.src = book.coverImage;
            img.alt = book.title;
            img.className = 'cover-img';
            coverEl.appendChild(img);
        } else {
            // Local book: gradient cover
            const [c1, c2] = book.coverGradient || ['#1e3a5f', '#3b82f6'];
            coverEl.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
            if (coverIcon) coverIcon.style.display = '';
        }

        document.getElementById('book-title').textContent = book.title;
        document.getElementById('book-author').textContent = `by ${book.author}`;
        document.getElementById('book-genre-badge').textContent = book.genre || 'General';
        
        // Description - strip HTML tags from Google Books descriptions
        const rawDesc = book.description || 'A compelling read from our collection.';
        const cleanDesc = rawDesc.replace(/<[^>]*>/g, '');
        document.getElementById('book-description').textContent = cleanDesc.length > 400 
            ? cleanDesc.substring(0, 400) + '...' 
            : cleanDesc;

        // Book metadata (rating, pages, publisher) for Google Books
        const metaContainer = document.getElementById('book-meta');
        if (metaContainer) metaContainer.remove();
        
        if (book.source === 'google') {
            const metaDiv = document.createElement('div');
            metaDiv.id = 'book-meta';
            metaDiv.className = 'book-meta';
            
            const metaItems = [];
            if (book.rating) {
                const stars = '★'.repeat(Math.round(book.rating)) + '☆'.repeat(5 - Math.round(book.rating));
                metaItems.push(`<span class="meta-item"><span class="meta-stars">${stars}</span> ${book.rating}/5${book.ratingsCount ? ` (${book.ratingsCount})` : ''}</span>`);
            }
            if (book.pageCount) {
                metaItems.push(`<span class="meta-item">📄 ${book.pageCount} pages</span>`);
            }
            if (book.publishedDate) {
                metaItems.push(`<span class="meta-item">📅 ${book.publishedDate}</span>`);
            }
            if (book.publisher) {
                metaItems.push(`<span class="meta-item">🏢 ${book.publisher}</span>`);
            }
            
            metaDiv.innerHTML = metaItems.join('');
            const descEl = document.getElementById('book-description');
            descEl.parentNode.insertBefore(metaDiv, descEl.nextSibling);
        }

        // Branch availability (only for local books)
        const branchSection = document.querySelector('.branch-availability');
        const branchList = document.getElementById('branch-list');
        branchList.innerHTML = '';

        if (book.source === 'google') {
            branchSection.style.display = 'none';
        } else {
            branchSection.style.display = '';
            const branches = book.branches || [{ name: 'Main Branch', copies: book.available_copies || 0 }];
            branches.forEach(b => {
                const item = document.createElement('div');
                item.className = 'branch-item';
                item.innerHTML = `
                    <span class="branch-name">${b.name}</span>
                    <span class="branch-copies ${b.copies > 0 ? 'available' : 'unavailable'}">${b.copies > 0 ? `${b.copies} available` : 'Unavailable'}</span>`;
                branchList.appendChild(item);
            });
        }

        // Action buttons
        const actionsEl = document.getElementById('book-actions');
        actionsEl.innerHTML = '';

        if (book.source === 'google') {
            // Google Books: Preview link + Add to Wishlist
            if (book.previewLink) {
                const previewBtn = document.createElement('a');
                previewBtn.href = book.previewLink;
                previewBtn.target = '_blank';
                previewBtn.className = 'btn-borrow';
                previewBtn.textContent = '📖 Preview on Google Books';
                previewBtn.style.textAlign = 'center';
                previewBtn.style.textDecoration = 'none';
                previewBtn.style.display = 'block';
                actionsEl.appendChild(previewBtn);
            }
            const wishBtn = document.createElement('button');
            wishBtn.className = 'btn-waitlist';
            wishBtn.textContent = '❤️ Add to Wishlist';
            wishBtn.addEventListener('click', () => handleWaitlist(book));
            actionsEl.appendChild(wishBtn);
        } else {
            const branches = book.branches || [{ name: 'Main Branch', copies: book.available_copies || 0 }];
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
        const borrowDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14); // 2 weeks to return a book

        data.borrowed.push({ 
            id: book.id, 
            title: book.title, 
            author: book.author, 
            coverGradient: book.coverGradient,
            coverImage: book.coverImage,
            borrowDate: borrowDate.toISOString(),
            dueDate: dueDate.toISOString()
        });
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
        data.waitlist.push({ id: book.id, title: book.title, author: book.author, coverGradient: book.coverGradient, coverImage: book.coverImage });
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

    // ============================
    // Chatbot Frontend Logic
    // ============================
    const chatToggle = document.getElementById('chat-toggle');
    const chatWindow = document.getElementById('chat-window');
    const chatClose = document.getElementById('chat-close');
    const chatMessages = document.getElementById('chat-messages');
    const chatInputForm = document.getElementById('chat-input-form');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');

    let chatHistory = []; // Local history for the session

    chatToggle.addEventListener('click', () => {
        chatWindow.classList.toggle('hidden');
        if (!chatWindow.classList.contains('hidden')) {
            chatInput.focus();
        }
    });

    chatClose.addEventListener('click', () => {
        chatWindow.classList.add('hidden');
    });

    function addMessage(content, role) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        messageDiv.innerHTML = `<div class="message-content">${content}</div>`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function handleChat(e) {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (!message) return;

        // Clear input and disable button
        chatInput.value = '';
        chatInput.disabled = true;
        chatSend.disabled = true;

        // Add user message to UI
        addMessage(message, 'user');

        // Add typing indicator
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.textContent = 'FastLib Assistant is thinking...';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    history: chatHistory
                }),
            });

            const data = await response.json();

            // Remove typing indicator
            typingDiv.remove();

            if (data.response) {
                addMessage(data.response, 'ai');
                // Persist only clean history (simplified for Gemini SDK)
                chatHistory.push({ role: "user", parts: [{ text: message }] });
                chatHistory.push({ role: "model", parts: [{ text: data.response }] });
            } else {
                addMessage(data.error || "I'm sorry, I'm having trouble connecting right now. Please try again later.", 'ai');
            }
        } catch (error) {
            console.error('Chat error:', error);
            typingDiv.remove();
            addMessage("Unable to reach the server. Please check your connection and try again.", 'ai');
        } finally {
            chatInput.disabled = false;
            chatSend.disabled = false;
            chatInput.focus();
        }
    }

    chatInputForm.addEventListener('submit', handleChat);
    
    // Newsletter Logic
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('newsletter-email').value;
            showToast(`Thanks for subscribing with ${email}! 🚀`, 'success');
            newsletterForm.reset();
        });
    }
    // Hero Section Buttons
    const heroReadNowBtn = document.querySelector('.hero-main-book-card .btn-read-now');
    const heroWishlistLink = document.querySelector('.hero-main-book-card .add-wishlist-link');

    if (heroReadNowBtn) {
        heroReadNowBtn.addEventListener('click', () => {
            const book = mockBooks.find(b => b.title === "The Psychology of Money");
            if (book) openBookModal(book);
        });
    }

    if (heroWishlistLink) {
        heroWishlistLink.addEventListener('click', (e) => {
            e.preventDefault();
            const book = mockBooks.find(b => b.title === "The Psychology of Money");
            if (book) handleWaitlist(book);
        });
    }
});
