import { downloadVideo, cleanupVideo } from "../lib/youtube";
import { uploadToGemini, analyzeVideo } from "../lib/gemini";
import { COMBINED_PROMPT } from "../prompts/prompts";
import { contentPackSchema } from "../prompts/schema";
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
    const url = process.argv[2];
    if (!url) {
        console.error("Please provide a URL as an argument.");
        process.exit(1);
    }

    console.log(`Testing pipeline with URL: ${url}`);

    let filePath: string | null = null;

    try {
        console.log("1. Downloading...");
        const downloadResult = await downloadVideo(url);
        filePath = downloadResult.filePath;
        console.log("   Downloaded to:", filePath);

        console.log("2. Uploading to Gemini...");
        const uploadResult = await uploadToGemini(filePath);
        console.log("   Uploaded URI:", uploadResult.uri);

        console.log("3. Analyzing...");
        const jsonString = await analyzeVideo(
            uploadResult.uri,
            COMBINED_PROMPT,
            contentPackSchema
        );

        console.log("4. Result:");
        console.log(jsonString);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        if (filePath) {
            console.log("Cleanup...");
            await cleanupVideo(filePath);
        }
    }
}

main();
