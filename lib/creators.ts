import fs from 'fs';
import path from 'path';
import { fetchInstagramPosts } from './instagram';

const DATA_ROOT = process.env.DATA_DIR || (process.env.VERCEL ? '/tmp/astral-data' : path.join(process.cwd(), 'data'));
const CREATORS_PATH = path.join(DATA_ROOT, 'creators.json');

export interface Creator {
    id: string;
    name: string;
    platform: 'youtube' | 'tiktok' | 'instagram';
    channelId?: string;
    channelUrl: string;
    addedAt: string;
}

export interface Video {
    id: string;
    title: string;
    thumbnail: string;
    url: string;
    views: number;
    publishedAt: string;
    channelName: string;
}

// Ensure data directory exists
if (!fs.existsSync(path.dirname(CREATORS_PATH))) {
    fs.mkdirSync(path.dirname(CREATORS_PATH), { recursive: true });
}

// Initialize creators.json if not exists
if (!fs.existsSync(CREATORS_PATH)) {
    fs.writeFileSync(CREATORS_PATH, JSON.stringify([], null, 2));
}

export async function getCreators(): Promise<Creator[]> {
    try {
        const fileContent = fs.readFileSync(CREATORS_PATH, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        return [];
    }
}

export async function addCreator(creator: Omit<Creator, 'id' | 'addedAt'>): Promise<Creator> {
    const creators = await getCreators();

    const newCreator: Creator = {
        ...creator,
        id: crypto.randomUUID(),
        addedAt: new Date().toISOString()
    };

    creators.push(newCreator);
    fs.writeFileSync(CREATORS_PATH, JSON.stringify(creators, null, 2));

    return newCreator;
}

export async function removeCreator(id: string): Promise<void> {
    const creators = await getCreators();
    const filtered = creators.filter(c => c.id !== id);
    fs.writeFileSync(CREATORS_PATH, JSON.stringify(filtered, null, 2));
}

export async function fetchYouTubeChannelVideos(channelId: string): Promise<Video[]> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        throw new Error('Missing YOUTUBE_API_KEY');
    }

    try {
        // Fetch channel's uploads playlist
        const channelResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet&id=${channelId}&key=${apiKey}`
        );

        if (!channelResponse.ok) {
            throw new Error('Failed to fetch channel info');
        }

        const channelData = await channelResponse.json();
        const uploadsPlaylistId = channelData.items[0]?.contentDetails?.relatedPlaylists?.uploads;
        const channelName = channelData.items[0]?.snippet?.title || 'Unknown';

        if (!uploadsPlaylistId) {
            throw new Error('Could not find uploads playlist');
        }

        // Fetch recent videos from uploads playlist
        const playlistResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=10&key=${apiKey}`
        );

        if (!playlistResponse.ok) {
            throw new Error('Failed to fetch videos');
        }

        const playlistData = await playlistResponse.json();

        // Fetch video statistics
        const videoIds = playlistData.items.map((item: any) => item.snippet.resourceId.videoId).join(',');
        const statsResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${apiKey}`
        );

        const statsData = await statsResponse.json();
        const statsMap = new Map(
            statsData.items.map((item: any) => [item.id, parseInt(item.statistics.viewCount || '0')])
        );

        return playlistData.items.map((item: any) => ({
            id: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium.url,
            url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
            views: statsMap.get(item.snippet.resourceId.videoId) || 0,
            publishedAt: item.snippet.publishedAt,
            channelName: channelName
        }));
    } catch (error) {
        console.error('Error fetching YouTube videos:', error);
        throw error;
    }
}

export async function extractYouTubeChannelId(url: string): Promise<string | null> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        throw new Error('Missing YOUTUBE_API_KEY');
    }

    // First, try to extract channel ID directly from URL
    const channelIdPattern = /youtube\.com\/channel\/([^\/\?]+)/;
    const channelIdMatch = url.match(channelIdPattern);
    if (channelIdMatch) {
        return channelIdMatch[1];
    }

    // If it's a handle (@username), we need to resolve it via API
    const handlePattern = /youtube\.com\/@([^\/\?]+)/;
    const handleMatch = url.match(handlePattern);

    if (handleMatch) {
        const handle = handleMatch[1];
        try {
            // Use the search API to find the channel by handle
            const searchResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${handle}&key=${apiKey}`
            );

            if (!searchResponse.ok) {
                throw new Error('Failed to search for channel');
            }

            const searchData = await searchResponse.json();
            if (searchData.items && searchData.items.length > 0) {
                return searchData.items[0].snippet.channelId;
            }
        } catch (error) {
            console.error('Error resolving channel handle:', error);
            return null;
        }
    }

    // Try other patterns (legacy URLs)
    const patterns = [
        /youtube\.com\/c\/([^\/\?]+)/,
        /youtube\.com\/user\/([^\/\?]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            // These also need API resolution, use search
            try {
                const searchResponse = await fetch(
                    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${match[1]}&key=${apiKey}`
                );
                const searchData = await searchResponse.json();
                if (searchData.items && searchData.items.length > 0) {
                    return searchData.items[0].snippet.channelId;
                }
            } catch (error) {
                console.error('Error resolving channel:', error);
            }
        }
    }

    return null;
}

export async function fetchAllCreatorsVideos(limitPerCreator: number = 10): Promise<Video[]> {
    const creators = await getCreators();
    const allVideos: Video[] = [];

    for (const creator of creators) {
        if (creator.platform === 'youtube' && creator.channelId) {
            try {
                const videos = await fetchYouTubeChannelVideos(creator.channelId);
                const videosWithCreator = videos.slice(0, limitPerCreator).map(video => ({
                    ...video,
                    channelName: creator.name // Ensure channelName is correctly set from creator.name
                }));
                allVideos.push(...videosWithCreator);
            } catch (error) {
                console.error(`Failed to fetch YouTube videos for ${creator.name}:`, error);
            }
        } else if (creator.platform === 'instagram') {
            try {
                // Extract username from URL (e.g., https://www.instagram.com/username/)
                const match = creator.channelUrl.match(/instagram\.com\/([^/]+)/i);
                const username = match ? match[1] : null;
                if (username) {
                    const instaVideos = await fetchInstagramPosts(username, limitPerCreator);
                    const videosWithCreator = instaVideos.map(video => ({
                        ...video,
                        channelName: creator.name
                    }));
                    allVideos.push(...videosWithCreator);
                }
            } catch (error) {
                console.error(`Failed to fetch Instagram posts for ${creator.name}:`, error);
            }
        }
    }

    // Sort by views descending
    return allVideos.sort((a, b) => b.views - a.views);
}
