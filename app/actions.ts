"use server"

import { downloadVideo, cleanupVideo } from "@/lib/youtube"
import { uploadToGemini, analyzeVideo } from "@/lib/gemini"
import { COMBINED_PROMPT, getPromptForStyle, getLinkedInPrompt } from "@/prompts/prompts"
import { contentPackSchema } from "@/prompts/schema"
import { saveRemix } from "@/lib/storage"
import { postToLinkedIn } from "@/lib/linkedin"
import { fetchAINews } from "@/lib/news"
import { getCreators, addCreator, removeCreator, fetchYouTubeChannelVideos, extractYouTubeChannelId, fetchAllCreatorsVideos } from "@/lib/creators";
import { generate as nanoGenerate } from "@/lib/nanoBanana";
import { addToQueue, updateQueueItem, getQueue } from "@/lib/queue"

export async function remixVideo(formData: FormData) {
    const url = formData.get("url") as string
    const style = (formData.get("style") as 'punchy' | 'explainer' | 'deepdive') || 'punchy'
    const model = (formData.get("model") as 'gemini' | 'nano') || 'gemini'

    if (!url) {
        return { error: "URL is required" }
    }

    let filePath: string | null = null;

    try {
        console.log("Step 1: Downloading video...");
        const downloadResult = await downloadVideo(url);
        filePath = downloadResult.filePath;

        console.log("Step 2: Uploading to Gemini...");
        const uploadResult = await uploadToGemini(filePath);

        console.log("Step 3: Analyzing and Remixing...");
        const prompt = getPromptForStyle(style);

        let jsonString: string;

        if (model === 'nano') {
            // Use Nano Banana for fast, cheap generation
            console.log("Using Nano Banana model...");
            const nanoPrompt = `${prompt}\n\nVideo URI: ${uploadResult.uri}\n\nGenerate a JSON response matching the content pack schema.`;
            jsonString = await nanoGenerate(nanoPrompt, { maxTokens: 2048 });
        } else {
            // Use Gemini for high-quality generation (default)
            console.log("Using Gemini model...");
            jsonString = await analyzeVideo(
                uploadResult.uri,
                prompt,
                contentPackSchema
            );
        }

        const data = JSON.parse(jsonString);

        // Generate dynamic thumbnail URL
        if (data.audrey_remix?.thumbnail_headline) {
            // Use absolute URL for the server-side generation if needed, or relative for client
            // For now, we construct a relative URL that the client can use
            const headline = encodeURIComponent(data.audrey_remix.thumbnail_headline);
            data.audrey_remix.linkedin_image = `http://localhost:3000/api/thumbnail?title=${headline}`;
        }

        // Save to DB
        await saveRemix({
            url,
            ...data
        });

        return {
            success: true,
            data: data
        }

    } catch (error: any) {
        console.error("Pipeline Error:", error);
        return {
            error: error.message || "Something went wrong during the remix process."
        }
    } finally {
        if (filePath) {
            console.log("Cleanup: Removing temp file...");
            await cleanupVideo(filePath);
        }
    }
}

export async function shareToLinkedIn(text: string, imageUrl?: string) {
    try {
        const result = await postToLinkedIn(text, imageUrl);
        return { success: true, data: result };
    } catch (error: any) {
        console.error("LinkedIn Share Error:", error);
        return { success: false, error: error.message };
    }
}

export async function getAINews() {
    try {
        const news = await fetchAINews();
        return { success: true, data: news };
    } catch (error: any) {
        console.error("News Fetch Error:", error);
        return { success: false, error: error.message };
    }
}

export async function remixArticle(articleUrl: string, articleTitle: string, style: 'punchy' | 'explainer' | 'deepdive' = 'punchy', model: 'gemini' | 'nano' = 'gemini') {
    try {
        console.log("Fetching article content...");
        const response = await fetch(articleUrl);
        const html = await response.text();

        // Simple text extraction (strip HTML tags)
        const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 5000);

        const articlePrompt = `${getPromptForStyle(style)}\n\nARTICLE TITLE: ${articleTitle}\n\nARTICLE CONTENT:\n${text}`;

        let jsonString: string;

        if (model === 'nano') {
            // Use Nano Banana for fast, cheap generation
            console.log("Analyzing article with Nano Banana...");
            const nanoPrompt = `${articlePrompt}\n\nGenerate a JSON response matching the content pack schema.`;
            jsonString = await nanoGenerate(nanoPrompt, { maxTokens: 2048 });
        } else {
            // Use Gemini for high-quality generation (default)
            console.log("Analyzing article with Gemini...");
            const { getClients } = await import("@/lib/gemini");
            const clients = getClients();

            const geminiModel = clients.genAI.getGenerativeModel({
                model: "gemini-2.0-flash",
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: contentPackSchema
                }
            });

            const result = await geminiModel.generateContent(articlePrompt);
            jsonString = result.response.text();
        }

        const data = JSON.parse(jsonString);

        // Generate dynamic thumbnail URL
        if (data.audrey_remix?.thumbnail_headline) {
            const headline = encodeURIComponent(data.audrey_remix.thumbnail_headline);
            data.audrey_remix.linkedin_image = `http://localhost:3000/api/thumbnail?title=${headline}`;
        }

        // Save to DB
        await saveRemix({
            url: articleUrl,
            ...data
        });

        return {
            success: true,
            data: data
        };

    } catch (error: any) {
        console.error("Article Remix Error:", error);
        return {
            error: error.message || "Something went wrong during the article remix process."
        };
    }
}

export async function regenerateLinkedInPost(
    sourceContent: string,
    linkedinStyle: 'thought_leader' | 'data_driven' | 'story_driven' | 'hot_take'
) {
    try {
        const { getClients } = await import("@/lib/gemini");
        const clients = getClients();

        const model = clients.genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: contentPackSchema
            }
        });

        const prompt = getLinkedInPrompt(linkedinStyle, sourceContent);
        const result = await model.generateContent(prompt);
        const jsonString = result.response.text();
        const data = JSON.parse(jsonString);

        // Generate dynamic thumbnail URL
        if (data.audrey_remix?.thumbnail_headline) {
            const headline = encodeURIComponent(data.audrey_remix.thumbnail_headline);
            data.audrey_remix.linkedin_image = `http://localhost:3000/api/thumbnail?title=${headline}`;
        }

        return {
            success: true,
            data: data.audrey_remix
        };

    } catch (error: any) {
        console.error("LinkedIn Regeneration Error:", error);
        return {
            success: false,
            error: error.message || "Failed to regenerate LinkedIn post."
        };
    }
}

export async function listCreators() {
    try {
        const creators = await getCreators();
        return { success: true, data: creators };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createCreator(channelUrl: string, name: string) {
    try {
        // Detect platform based on URL
        if (channelUrl.includes('instagram.com')) {
            // Instagram creator – no channelId needed
            const creator = await addCreator({
                name,
                platform: 'instagram',
                channelUrl
            });
            return { success: true, data: creator };
        }
        // Default to YouTube handling
        const channelId = await extractYouTubeChannelId(channelUrl);
        if (!channelId) {
            return { success: false, error: 'Invalid YouTube channel URL' };
        }
        const creator = await addCreator({
            name,
            platform: 'youtube',
            channelId,
            channelUrl
        });
        return { success: true, data: creator };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteCreator(id: string) {
    try {
        await removeCreator(id);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function scanCreatorVideos(channelId: string) {
    try {
        const videos = await fetchYouTubeChannelVideos(channelId);
        // Sort by views descending
        const sorted = videos.sort((a, b) => b.views - a.views);
        return { success: true, data: sorted };
    } catch (error: any) {
        console.error('Scan Error:', error);
        return { success: false, error: error.message };
    }
}

export async function batchRemixVideos(videoUrls: string[], style: 'punchy' | 'explainer' | 'deepdive' = 'punchy', model: 'gemini' | 'nano' = 'gemini') {
    try {
        // Add all videos to queue
        const queueItems = await Promise.all(
            videoUrls.map(url => addToQueue({
                url,
                sourceType: 'video'
            }))
        );

        // Process each video sequentially
        const results = [];

        for (const item of queueItems) {
            try {
                await updateQueueItem(item.id, { status: 'processing' });

                const formData = new FormData();
                formData.append('url', item.url);
                formData.append('style', style);
                formData.append('model', model);

                const result = await remixVideo(formData);

                if (result.success) {
                    await updateQueueItem(item.id, {
                        status: 'completed',
                        contentPack: result.data,
                        completedAt: new Date().toISOString()
                    });
                    results.push({ url: item.url, success: true });
                } else {
                    await updateQueueItem(item.id, {
                        status: 'failed',
                        error: result.error,
                        completedAt: new Date().toISOString()
                    });
                    results.push({ url: item.url, success: false, error: result.error });
                }
            } catch (error: any) {
                await updateQueueItem(item.id, {
                    status: 'failed',
                    error: error.message,
                    completedAt: new Date().toISOString()
                });
                results.push({ url: item.url, success: false, error: error.message });
            }
        }

        return {
            success: true,
            data: {
                total: videoUrls.length,
                completed: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
                results
            }
        };
    } catch (error: any) {
        console.error('Batch Remix Error:', error);
        return { success: false, error: error.message };
    }
}

export async function getQueueItems() {
    try {
        const queue = await getQueue();
        return { success: true, data: queue };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function scanAllCreators(limitPerCreator: number = 10) {
    try {
        const videos = await fetchAllCreatorsVideos(limitPerCreator);
        return { success: true, data: videos };
    } catch (error: any) {
        console.error('Scan All Error:', error);
        return { success: false, error: error.message };
    }
}

export async function schedulePost(queueItemId: string, scheduledFor: string, platform: 'linkedin' | 'twitter' | 'both' = 'linkedin') {
    try {
        const { scheduleQueueItem } = await import('@/lib/queue');
        await scheduleQueueItem(queueItemId, scheduledFor, platform);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getScheduledPosts() {
    try {
        const { getScheduledItems } = await import('@/lib/queue');
        const items = await getScheduledItems();
        return { success: true, data: items };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteQueueItem(id: string) {
    try {
        const { removeFromQueue } = await import('@/lib/queue');
        await removeFromQueue(id);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
