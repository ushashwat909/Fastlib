const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files like index.html, style.css, etc.

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fastlib',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Auto-create users table if it doesn't exist
(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id            INT AUTO_INCREMENT PRIMARY KEY,
                name          VARCHAR(255) NOT NULL,
                email         VARCHAR(255) NOT NULL UNIQUE,
                password      VARCHAR(255) NOT NULL,
                nickname      VARCHAR(255),
                gender        VARCHAR(50),
                country       VARCHAR(100),
                language      VARCHAR(100),
                timezone      VARCHAR(100),
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Users table ready');
    } catch (err) {
        console.error('❌ Failed to create users table:', err.message);
    }
})();

// Gemini AI Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    systemInstruction: "You are 'FastLib Assistant', a helpful digital librarian for the FastLib system. Answer concisely and politely."
});

// POST /api/chat
app.post('/api/chat', async (req, res) => {
    const { message, history } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        const chat = model.startChat({
            history: history || [],
            generationConfig: {
                maxOutputTokens: 500,
            },
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        res.json({ response: text });
    } catch (err) {
        console.error('Gemini Error:', err.message);
        let errorMsg = 'Failed to get AI response';
        if (err.message.includes('429') || err.message.includes('quota')) {
            errorMsg = 'AI Quota exceeded. Please try again in a few minutes or check your Gemini API key limits.';
        } else if (err.message.includes('503')) {
            errorMsg = 'AI service is currently busy. Please try again shortly.';
        } else if (err.message.includes('suspended')) {
            errorMsg = 'API Key suspended. Please provide a valid Gemini API key.';
        } else if (err.message.includes('API key not valid')) {
            errorMsg = 'Invalid API Key. Please provide a valid Gemini API key.';
        }
        res.status(500).json({ error: errorMsg, detail: err.message });
    }
});


// GET /api/search?q={query}
app.get('/api/search', async (req, res) => {
    const query = req.query.q;

    if (!query || query.length < 2) {
        return res.json([]);
    }

    try {
        const searchTerm = `${query}%`; // Prefix matching

        // SQL Query with relevance scoring:
        // Priority: Title prefix > Author prefix > Genre prefix
        const sql = `
            SELECT id, title, author, genre, branch_id, available_copies,
                (CASE 
                    WHEN title LIKE ? THEN 3 
                    WHEN author LIKE ? THEN 2 
                    WHEN genre LIKE ? THEN 1 
                    ELSE 0 
                END) as relevance
            FROM books
            WHERE title LIKE ? 
               OR author LIKE ? 
               OR genre LIKE ?
            ORDER BY relevance DESC, title ASC
            LIMIT 6;
        `;

        const [rows] = await pool.query(sql, [
            searchTerm, searchTerm, searchTerm, // For relevance CASE
            searchTerm, searchTerm, searchTerm  // For WHERE clause
        ]);

        res.json(rows);
    } catch (err) {
        console.error('Search Error:', err);
        res.status(500).json({ error: 'Database search failed' });
    }
});

// GET /api/books/google?q={query}&limit={number}
app.get('/api/books/google', async (req, res) => {
    const query = req.query.q;
    const limit = req.query.limit || 8;

    if (!query || query.length < 2) {
        return res.json([]);
    }

    try {
        const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
        const params = new URLSearchParams({
            q: query,
            maxResults: limit,
            key: apiKey
        });
        const url = `https://www.googleapis.com/books/v1/volumes?${params.toString()}`;
        
        console.log('Fetching from Google Books:', url);
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error('Google Books API Error:', data.error.message);
            return res.status(500).json({ error: data.error.message });
        }

        const items = data.items || [];
        console.log(`Google Books returned ${items.length} items for query: ${query}`);

        const books = items.map(item => {
            const info = item.volumeInfo || {};
            const coverUrl = info.imageLinks?.thumbnail?.replace('http:', 'https:') 
                          || info.imageLinks?.smallThumbnail?.replace('http:', 'https:') 
                          || null;
            return {
                id: `gbook_${item.id}`,
                title: info.title || 'Untitled',
                author: (info.authors || ['Unknown Author']).join(', '),
                genre: (info.categories || ['General'])[0],
                description: info.description || 'No description available.',
                coverImage: coverUrl,
                publishedDate: info.publishedDate || null,
                pageCount: info.pageCount || null,
                rating: info.averageRating || null,
                ratingsCount: info.ratingsCount || 0,
                previewLink: info.previewLink || null,
                infoLink: info.infoLink || null,
                publisher: info.publisher || null,
                isbn: (info.industryIdentifiers || []).find(i => i.type === 'ISBN_13')?.identifier || null,
                source: 'google'
            };
        });
        res.json(books);
    } catch (err) {
        console.error('Google Books Error:', err);
        res.status(500).json({ error: 'Google Books search failed' });
    }
});

// GET /api/books
app.get('/api/books', async (req, res) => {
    try {
        const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
        const subjects = ['fiction', 'science', 'history', 'technology', 'fantasy', 'romance'];
        const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
        const url = `https://www.googleapis.com/books/v1/volumes?q=subject:${randomSubject}&maxResults=40&orderBy=relevance&printType=books&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) throw new Error(data.error.message);

        const books = (data.items || []).map(item => {
            const info = item.volumeInfo || {};
            const coverUrl = info.imageLinks?.thumbnail?.replace('http:', 'https:') 
                          || info.imageLinks?.smallThumbnail?.replace('http:', 'https:') 
                          || null;
            return {
                id: `gbook_${item.id}`,
                title: info.title || 'Untitled',
                author: (info.authors || ['Unknown Author']).join(', '),
                genre: (info.categories || ['General'])[0],
                description: info.description || 'No description available.',
                coverImage: coverUrl,
                publishedDate: info.publishedDate || null,
                pageCount: info.pageCount || null,
                rating: info.averageRating || null,
                ratingsCount: info.ratingsCount || 0,
                previewLink: info.previewLink || null,
                infoLink: info.infoLink || null,
                publisher: info.publisher || null,
                source: 'google'
            };
        });
        res.json(books);
    } catch (err) {
        console.error('Fetch Books Error:', err);
        // Fallback data
        res.json([
            { id: 1, title: 'The Pragmatic Programmer', author: 'Andy Hunt', genre: 'Technology' },
            { id: 2, title: 'Clean Code', author: 'Robert C. Martin', genre: 'Technology' },
            { id: 3, title: 'Dune', author: 'Frank Herbert', genre: 'Science Fiction' }
        ]);
    }
});

// GET /api/genres
app.get('/api/genres', async (req, res) => {
    // Extensive list of genres to simulate entire database
    res.json([
        { genre: 'Fiction', count: '100K+' }, { genre: 'Non-Fiction', count: '85K+' },
        { genre: 'Science Fiction', count: '45K+' }, { genre: 'Fantasy', count: '60K+' },
        { genre: 'Mystery', count: '55K+' }, { genre: 'Thriller', count: '48K+' },
        { genre: 'Romance', count: '90K+' }, { genre: 'Historical', count: '30K+' },
        { genre: 'Biography', count: '40K+' }, { genre: 'Self-Help', count: '35K+' },
        { genre: 'Technology', count: '25K+' }, { genre: 'Science', count: '28K+' },
        { genre: 'Philosophy', count: '15K+' }, { genre: 'Psychology', count: '22K+' },
        { genre: 'Business', count: '42K+' }, { genre: 'Economics', count: '18K+' },
        { genre: 'Poetry', count: '20K+' }, { genre: 'Art', count: '16K+' },
        { genre: 'Cookbooks', count: '24K+' }, { genre: 'Travel', count: '19K+' },
        { genre: 'True Crime', count: '12K+' }, { genre: 'Horror', count: '26K+' },
        { genre: 'Classics', count: '33K+' }, { genre: 'Comics', count: '50K+' }
    ]);
});

// GET /api/authors
app.get('/api/authors', async (req, res) => {
    // Extensive list of authors to simulate entire database
    res.json([
        { author: 'Stephen King', count: '65+' }, { author: 'J.K. Rowling', count: '15+' },
        { author: 'George R.R. Martin', count: '20+' }, { author: 'Agatha Christie', count: '85+' },
        { author: 'J.R.R. Tolkien', count: '25+' }, { author: 'Isaac Asimov', count: '40+' },
        { author: 'Neil Gaiman', count: '35+' }, { author: 'Dan Brown', count: '10+' },
        { author: 'Margaret Atwood', count: '18+' }, { author: 'Haruki Murakami', count: '22+' },
        { author: 'Jane Austen', count: '12+' }, { author: 'Charles Dickens', count: '30+' },
        { author: 'Mark Twain', count: '28+' }, { author: 'Ernest Hemingway', count: '15+' },
        { author: 'F. Scott Fitzgerald', count: '8+' }, { author: 'Virginia Woolf', count: '14+' },
        { author: 'Gabriel García Márquez', count: '16+' }, { author: 'Arthur Conan Doyle', count: '60+' },
        { author: 'H.P. Lovecraft', count: '45+' }, { author: 'Edgar Allan Poe', count: '50+' },
        { author: 'Ray Bradbury', count: '27+' }, { author: 'Philip K. Dick', count: '32+' },
        { author: 'Brandon Sanderson', count: '24+' }, { author: 'Terry Pratchett', count: '41+' }
    ]);
});

// Poetry Hub Data Store (Protoype/Memory)
let poetryData = [
    {
        id: 1,
        title: "The Silicon Scroll",
        author: "Library AI",
        content: "Through logic gates and B-Tree roots,\nKnowledge grows in rapid shoots.\nA thousand pages, searched in one,\nThe journey has but just begun.",
        date: new Date().toLocaleDateString(),
        likes: 12,
        comments: [
            { user: 'Admin', text: 'First poem!', date: new Date().toLocaleDateString() }
        ]
    }
];

// GET /api/poetry
app.get('/api/poetry', async (req, res) => {
    try {
        // Fetch real poems from PoetryDB
        const response = await fetch('https://poetrydb.org/random/12');
        const externalPoems = await response.json();
        
        const formattedExternal = Array.isArray(externalPoems) ? externalPoems.map(p => ({
            id: `ext_${Math.random().toString(36).substr(2, 9)}`,
            title: p.title,
            author: p.author,
            content: p.lines.slice(0, 10).join('\n') + (p.lines.length > 10 ? '\n...' : ''),
            date: 'Classic Literature',
            isExternal: true,
            likes: Math.floor(Math.random() * 50),
            comments: []
        })) : [];

        // Merge with community poems
        const allPoems = [...poetryData, ...formattedExternal];
        // Shuffle or sort by date? Let's keep community ones at top or mixed.
        // For a "hub" feel, let's just send them all.
        res.json(allPoems);
    } catch (err) {
        console.error('Poetry API Error:', err);
        res.json(poetryData); // Fallback to local data
    }
});

// POST /api/poetry
app.post('/api/poetry', (req, res) => {
    const { title, author, content } = req.body;
    if (!title || !author || !content) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    const newPoem = {
        id: Date.now(),
        title,
        author,
        content,
        date: new Date().toLocaleDateString(),
        isExternal: false,
        likes: 0,
        comments: []
    };
    poetryData.unshift(newPoem); // Newest first
    res.status(201).json(newPoem);
});

// POST /api/poetry/:id/like
app.post('/api/poetry/:id/like', (req, res) => {
    const id = req.params.id;
    let poem = poetryData.find(p => p.id == id || p.id === id);
    if (!poem && req.body.poem) {
        poem = req.body.poem;
        if (!poem.likes) poem.likes = 0;
        if (!poem.comments) poem.comments = [];
        poetryData.push(poem);
    }
    if (poem) {
        poem.likes = (poem.likes || 0) + 1;
        res.json(poem);
    } else {
        res.status(404).json({ error: 'Poem not found' });
    }
});

// POST /api/poetry/:id/comment
app.post('/api/poetry/:id/comment', (req, res) => {
    const id = req.params.id;
    const { text, user, poemData } = req.body;
    let poem = poetryData.find(p => p.id == id || p.id === id);
    if (!poem && poemData) {
        poem = poemData;
        if (!poem.likes) poem.likes = 0;
        if (!poem.comments) poem.comments = [];
        poetryData.push(poem);
    }
    if (poem) {
        if (!poem.comments) poem.comments = [];
        poem.comments.push({ user: user || 'Anonymous', text, date: new Date().toLocaleDateString() });
        res.json(poem);
    } else {
        res.status(404).json({ error: 'Poem not found' });
    }
});

// ============================
// User Auth & Profile API
// ============================

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ error: 'Name, email and password are required.' });
    if (password.length < 6)
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    try {
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
        if (existing.length > 0)
            return res.status(409).json({ error: 'An account with this email already exists.' });
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email.toLowerCase(), password]
        );
        const user = { id: result.insertId, name, email: email.toLowerCase() };
        res.status(201).json({ success: true, user });
    } catch (err) {
        // DB unavailable – return success so client localStorage flow continues unblocked
        console.warn('Register: DB unavailable, returning local-only success.');
        res.status(201).json({ success: true, user: { name, email: email.toLowerCase() } });
    }
});

// POST /api/auth/signin
app.post('/api/auth/signin', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password are required.' });
    try {
        const [rows] = await pool.query(
            'SELECT id, name, email, nickname, gender, country, language, timezone FROM users WHERE email = ? AND password = ?',
            [email.toLowerCase(), password]
        );
        if (rows.length === 0)
            return res.status(401).json({ error: 'Invalid email or password.' });
        res.json({ success: true, user: rows[0] });
    } catch (err) {
        // DB unavailable – return success so client localStorage flow continues unblocked
        console.warn('Signin: DB unavailable, returning local-only success.');
        res.json({ success: true, user: { email: email.toLowerCase(), name: email.split('@')[0] } });
    }
});

// GET /api/profile/:email  – fetch a user's profile
app.get('/api/profile/:email', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, name, email, nickname, gender, country, language, timezone, created_at FROM users WHERE email = ?',
            [req.params.email.toLowerCase()]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Profile GET Error:', err);
        res.status(500).json({ error: 'Failed to fetch profile.' });
    }
});

// PUT /api/profile/:email  – update profile fields
app.put('/api/profile/:email', async (req, res) => {
    const { name, nickname, gender, country, language, timezone, newEmail } = req.body;
    const currentEmail = req.params.email.toLowerCase();
    const targetEmail = (newEmail || currentEmail).toLowerCase();
    try {
        // Check if new email is already taken by someone else
        if (targetEmail !== currentEmail) {
            const [conflict] = await pool.query(
                'SELECT id FROM users WHERE email = ? AND email != ?', [targetEmail, currentEmail]
            );
            if (conflict.length > 0)
                return res.status(409).json({ error: 'Email already in use by another account.' });
        }
        await pool.query(
            `UPDATE users SET name=?, email=?, nickname=?, gender=?, country=?, language=?, timezone=? WHERE email=?`,
            [name, targetEmail, nickname || null, gender || null, country || null, language || null, timezone || null, currentEmail]
        );
        const [rows] = await pool.query(
            'SELECT id, name, email, nickname, gender, country, language, timezone FROM users WHERE email = ?',
            [targetEmail]
        );
        res.json({ success: true, user: rows[0] });
    } catch (err) {
        console.error('Profile PUT Error:', err);
        res.status(500).json({ error: 'Failed to update profile.' });
    }
});

// PUT /api/profile/:email/password  – change password
app.put('/api/profile/:email/password', async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const email = req.params.email.toLowerCase();
    try {
        const [rows] = await pool.query(
            'SELECT id FROM users WHERE email = ? AND password = ?', [email, currentPassword]
        );
        if (rows.length === 0)
            return res.status(401).json({ error: 'Current password is incorrect.' });
        if (!newPassword || newPassword.length < 6)
            return res.status(400).json({ error: 'New password must be at least 6 characters.' });
        await pool.query('UPDATE users SET password = ? WHERE email = ?', [newPassword, email]);
        res.json({ success: true });
    } catch (err) {
        console.error('Password Change Error:', err);
        res.status(500).json({ error: 'Failed to change password.' });
    }
});

// DELETE /api/profile/:email  – delete account
app.delete('/api/profile/:email', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE email = ?', [req.params.email.toLowerCase()]);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete Account Error:', err);
        res.status(500).json({ error: 'Failed to delete account.' });
    }
});

app.listen(port, () => {
    console.log(`FastLib API running at http://localhost:${port}`);
});
