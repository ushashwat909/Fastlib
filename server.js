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
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${limit}&orderBy=relevance&printType=books&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error('Google Books API Error:', data.error.message);
            return res.status(500).json({ error: data.error.message });
        }

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
            return {
                id: `gbook_${item.id}`,
                title: info.title || 'Untitled',
                author: (info.authors || ['Unknown Author'])[0],
                genre: (info.categories || ['General'])[0]
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

app.listen(port, () => {
    console.log(`FastLib API running at http://localhost:${port}`);
});
