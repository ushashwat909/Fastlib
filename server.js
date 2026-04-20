const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
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

app.listen(port, () => {
    console.log(`FastLib API running at http://localhost:${port}`);
});
