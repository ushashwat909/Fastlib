// const fetch = require('node-fetch'); // Using global fetch in Node 24
require('dotenv').config();

async function test(query) {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    const formattedQuery = query.replace(/\s+/g, '+');
    const url = `https://www.googleapis.com/books/v1/volumes?q=${formattedQuery}&maxResults=5&key=${apiKey}`;
    
    console.log(`Testing query: "${query}"`);
    console.log(`URL: ${url}`);
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.items) {
            console.log(`✅ Found ${data.items.length} items`);
        } else {
            console.log(`❌ No items found`);
            if (data.error) console.log('Error:', data.error.message);
        }
    } catch (err) {
        console.error('Fetch Error:', err.message);
    }
    console.log('---');
}

(async () => {
    await test('subject:Fiction');
    await test('subject:Non-Fiction');
    await test('subject:nonfiction');
    await test('subject:Science Fiction');
    await test('subject:Self-Help');
    await test('subject:selfhelp');
    await test('non-fiction bestsellers');
    await test('nonfiction bestsellers');
})();
