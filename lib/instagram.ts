// Instagram scraper utility
// Fetches recent public posts for a given Instagram username.
// Returns an array of Video objects compatible with the rest of the app.

// Using global fetch (Node 18+).
import { Video } from './creators';

/**
 * Fetches the latest public posts for an Instagram user.
 * Uses the unofficial JSON endpoint: https://www.instagram.com/<username>/?__a=1&__d=dis
 * This works for public profiles without authentication.
 *
 * @param username Instagram handle without the leading '@'
 * @param limit Number of posts to return (default 10)
 */
export async function fetchInstagramPosts(
    username: string,
    limit: number = 10
): Promise<Video[]> {
    const endpoint = `https://www.instagram.com/${username}/?__a=1&__d=dis`;
    const response = await fetch(endpoint, {
        headers: {
            // Instagram requires a user‑agent header for the JSON endpoint.
            'User-Agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch Instagram posts for ${username}`);
    }

    const json = await response.json();
    // Path to media edges may differ slightly across Instagram versions.
    const edges =
        json?.graphql?.user?.edge_owner_to_timeline_media?.edges || [];

    const videos: Video[] = edges.slice(0, limit).map((edge: any) => {
        const node = edge.node;
        const title =
            node.edge_media_to_caption?.edges?.[0]?.node?.text?.trim() ||
            'Untitled Instagram Post';
        const views = node.edge_liked_by?.count ?? 0; // Approximate popularity
        const url = `https://www.instagram.com/p/${node.shortcode}/`;
        const thumbnail = node.display_url;
        const publishedAt = node.taken_at_timestamp
            ? new Date(node.taken_at_timestamp * 1000).toISOString()
            : new Date().toISOString();

        return {
            id: node.id,
            title,
            thumbnail,
            url,
            views,
            publishedAt,
            channelName: username // We'll replace with creator.name later
        } as Video;
    });

    return videos;
}
