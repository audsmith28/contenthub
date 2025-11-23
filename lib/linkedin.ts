const LINKEDIN_API_URL = 'https://api.linkedin.com/v2';

export async function postToLinkedIn(text: string, imageUrl?: string) {
    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    const personUrn = process.env.LINKEDIN_PERSON_URN; // e.g., urn:li:person:123456

    if (!accessToken || !personUrn) {
        throw new Error("Missing LinkedIn credentials (LINKEDIN_ACCESS_TOKEN or LINKEDIN_PERSON_URN) in .env.local");
    }

    let assetUrn: string | undefined;

    if (imageUrl) {
        try {
            console.log("Downloading image for LinkedIn upload...");
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) throw new Error("Failed to download image from URL");
            const imageBuffer = await imageResponse.arrayBuffer();

            console.log("Registering upload with LinkedIn...");
            const registerResponse = await fetch(`${LINKEDIN_API_URL}/assets?action=registerUpload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    registerUploadRequest: {
                        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
                        owner: personUrn,
                        serviceRelationships: [{
                            relationshipType: "OWNER",
                            identifier: "urn:li:userGeneratedContent"
                        }]
                    }
                })
            });

            if (!registerResponse.ok) {
                const err = await registerResponse.text();
                throw new Error(`Failed to register LinkedIn upload: ${err}`);
            }

            const registerData = await registerResponse.json();
            const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
            assetUrn = registerData.value.asset;

            console.log("Uploading image binary...");
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/octet-stream',
                },
                body: Buffer.from(imageBuffer)
            });

            if (!uploadResponse.ok) throw new Error("Failed to upload image binary to LinkedIn");
            console.log("Image uploaded successfully.");

        } catch (error) {
            console.error("Error handling LinkedIn image:", error);
            // Fallback to text-only if image fails? Or throw? 
            // Let's throw for now so the user knows.
            throw error;
        }
    }

    const shareMediaCategory = assetUrn ? "IMAGE" : "NONE";
    const media = assetUrn ? [{
        status: "READY",
        description: { text: "AI Remix" },
        media: assetUrn,
        title: { text: "AI Remix" }
    }] : undefined;

    const postBody = {
        author: personUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
            "com.linkedin.ugc.ShareContent": {
                shareCommentary: { text: text },
                shareMediaCategory: shareMediaCategory,
                media: media
            }
        },
        visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
    };

    console.log("Creating LinkedIn post...");
    const postResponse = await fetch(`${LINKEDIN_API_URL}/ugcPosts`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(postBody)
    });

    if (!postResponse.ok) {
        const err = await postResponse.text();
        throw new Error(`Failed to post to LinkedIn: ${err}`);
    }

    return await postResponse.json();
}
