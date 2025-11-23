import YtDlpWrap from 'yt-dlp-wrap';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const binaryPath = path.join(process.cwd(), 'bin', 'yt-dlp');
const ytDlpWrap = new YtDlpWrap(binaryPath);

// Vercel file system is read-only except /tmp; use that when deployed.
const TMP_DIR = process.env.TMP_DIR || (process.env.VERCEL ? '/tmp/astral-tmp' : path.join(process.cwd(), 'tmp'));

if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

export async function downloadVideo(url: string): Promise<{ filePath: string; metadata: any }> {
    const videoId = uuidv4();
    const filePath = path.join(TMP_DIR, `${videoId}.mp4`);

    console.log(`Downloading video from ${url} to ${filePath}...`);

    try {
        // Get metadata first
        const metadata = await ytDlpWrap.getVideoInfo(url);

        // Download the video
        // -f "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4] / bv*+ba/b" ensures we get mp4 which is best for Gemini
        // -S "res:720" limits resolution to 720p to save bandwidth/processing (Gemini doesn't need 4k)
        await ytDlpWrap.execPromise([
            url,
            '-f', 'best[ext=mp4]/best',
            '-S', 'res:720',
            '-o', filePath,
            '--force-overwrites'
        ]);

        console.log('Download complete.');
        return { filePath, metadata };
    } catch (error) {
        console.error('Error downloading video:', error);
        throw new Error('Failed to download video');
    }
}

export async function cleanupVideo(filePath: string) {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}
