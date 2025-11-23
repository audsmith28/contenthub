import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API Key found");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Dummy model to get client

    // Actually, listModels is on the client? No, it's not directly exposed on genAI instance in some versions?
    // Wait, in 0.24.1 it might be different.
    // Let's check if we can just use the API directly or if there is a method.
    // The error message said "Call ListModels".

    // In the SDK, it's usually not on the instance.
    // I'll try to use a fetch call to the API if the SDK doesn't make it easy, 
    // OR I'll try to guess `gemini-pro` (1.0) just to see if it works.

    // But let's try to find the listModels method.
    // It seems it might not be in the high-level `GoogleGenerativeAI` class.

    // I'll try `gemini-pro` as a fallback in the main script if I can't list.
    // But let's try to fetch the list.

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
}

main();
