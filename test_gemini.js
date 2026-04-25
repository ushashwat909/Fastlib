const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGemini() {
    console.log('Testing Gemini API key...');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('No API key found in .env');
        process.exit(1);
    }
    
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent("Say 'API works' in one word.");
        const response = await result.response;
        console.log('Gemini Response:', response.text());
    } catch (err) {
        console.error('Gemini Test Failed:');
        console.error(err.message);
    }
}

testGemini();
