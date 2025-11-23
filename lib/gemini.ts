import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import path from "path";

// Lazy initialization to allow env vars to load
function getClients() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY environment variable.");
    }
    return {
        genAI: new GoogleGenerativeAI(apiKey),
        fileManager: new GoogleAIFileManager(apiKey)
    };
}

export { getClients };

export async function uploadToGemini(filePath: string, mimeType: string = "video/mp4") {
    const { fileManager } = getClients();

    try {
        const uploadResult = await fileManager.uploadFile(filePath, {
            mimeType,
            displayName: path.basename(filePath),
        });

        const file = uploadResult.file;
        console.log(`Uploaded file ${file.displayName} as: ${file.name}`);

        // Wait for the file to be active
        let fileState = file.state;
        while (fileState === FileState.PROCESSING) {
            console.log("Processing video...");
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const fileStatus = await fileManager.getFile(file.name);
            fileState = fileStatus.state;
            if (fileState === FileState.FAILED) {
                throw new Error("Video processing failed.");
            }
        }

        console.log(`Video ready: ${file.uri}`);
        return file;
    } catch (error) {
        console.error("Error uploading to Gemini:", error);
        throw error;
    }
}

export async function analyzeVideo(fileUri: string, prompt: string, schema?: any) {
    const { genAI } = getClients();

    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema
        }
    });

    const result = await model.generateContent([
        { fileData: { mimeType: "video/mp4", fileUri } },
        { text: prompt }
    ]);

    return result.response.text();
}
