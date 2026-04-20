-- FastLib Database Schema
CREATE DATABASE IF NOT EXISTS fastlib;
USE fastlib;

CREATE TABLE IF NOT EXISTS books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    genre VARCHAR(100),
    branch_id INT,
    available_copies INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FULLTEXT(title, author, genre) -- For relevance searching index
);

-- Seed some initial data
INSERT INTO books (title, author, genre, branch_id, available_copies) VALUES
('The Great Gatsby', 'F. Scott Fitzgerald', 'Classic', 1, 5),
('The Silent Patient', 'Alex Michaelides', 'Thriller', 2, 3),
('Atomic Habits', 'James Clear', 'Self-Help', 1, 10),
('Dune', 'Frank Herbert', 'Sci-Fi', 3, 2),
('Project Hail Mary', 'Andy Weir', 'Sci-Fi', 2, 4),
('Where the Crawdads Sing', 'Delia Owens', 'Fiction', 1, 6),
('The Midnight Library', 'Matt Haig', 'Contemporary', 1, 8),
('Deep Work', 'Cal Newport', 'Education', 3, 12),
('Clean Code', 'Robert C. Martin', 'Programming', 2, 7),
('Educated', 'Tara Westover', 'Memoir', 1, 5),
('Harry Potter and the Sorcerer\'s Stone', 'J.K. Rowling', 'Fantasy', 3, 15),
('Haruki Murakami Selection', 'Haruki Murakami', 'Fiction', 1, 4),
('Harmony of the Spheres', 'Various Authors', 'Musicology', 2, 1);
