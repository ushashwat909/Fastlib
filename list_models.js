const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
    console.log('Listing available models...');
    const apiKey = process.env.GEMINI_API_KEY;
    try {
        const fetch = require('node-fetch'); // May need to install if not in SDK
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Failed to list models:', err);
    }
}

listModels();
