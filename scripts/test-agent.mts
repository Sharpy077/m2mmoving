import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // Try .env.local first
if (!process.env.OPENAI_API_KEY) {
    dotenv.config({ path: '.env' }); // Fallback
}

async function main() {
    console.log('Testing OpenAI connection...');
    console.log('API Key present:', !!process.env.OPENAI_API_KEY);

    if (!process.env.OPENAI_API_KEY) {
        console.error('ERROR: No OPENAI_API_KEY found in .env or .env.local');
        process.exit(1);
    }

    try {
        const { text } = await generateText({
            model: openai('gpt-4o'),
            prompt: 'Hello, is this working?',
        });
        console.log('Success! Response:', text);
    } catch (error) {
        console.error('Failed:', error);
        process.exit(1);
    }
}

main();
