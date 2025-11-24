import YtDlpWrap from 'yt-dlp-wrap';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Vercel file system is read-only except /tmp; use that when deployed.
const TMP_DIR = process.env.TMP_DIR || (process.env.VERCEL ? '/tmp/astral-tmp' : path.join(process.cwd(), 'tmp'));
const BIN_DIR = process.env.VERCEL ? '/tmp/bin' : path.join(process.cwd(), 'bin');
const YT_DLP_PATH = path.join(BIN_DIR, 'yt-dlp');

if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
}

async function ensureYtDlpBinary() {
    if (fs.existsSync(YT_DLP_PATH)) {
        return new YtDlpWrap(YT_DLP_PATH);
    }

    console.log('yt-dlp binary not found. Downloading...');

    // Determine platform-specific binary name
    // Vercel (Linux) -> yt-dlp_linux
    // Mac -> yt-dlp_macos
    // Windows -> yt-dlp.exe

    let binaryName = 'yt-dlp'; // Fallback
    if (process.env.VERCEL || process.platform === 'linux') {
        binaryName = 'yt-dlp_linux';
    } else if (process.platform === 'darwin') {
        binaryName = 'yt-dlp_macos';
    } else if (process.platform === 'win32') {
        binaryName = 'yt-dlp.exe';
    }

    const downloadUrl = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${binaryName}`;
    console.log(`Downloading ${binaryName} from ${downloadUrl}...`);

    try {
        const response = await fetch(downloadUrl);
        if (!response.ok) {
            throw new Error(`Failed to download: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        fs.writeFileSync(YT_DLP_PATH, Buffer.from(buffer));

        console.log('yt-dlp binary downloaded successfully.');

        // Ensure it's executable
        fs.chmodSync(YT_DLP_PATH, '755');

        return new YtDlpWrap(YT_DLP_PATH);
    } catch (error) {
        console.error('Failed to download yt-dlp binary:', error);
        throw new Error('Failed to initialize yt-dlp');
    }
}

export async function downloadVideo(url: string): Promise<{ filePath: string; metadata: any }> {
    const ytDlpWrap = await ensureYtDlpBinary();
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
    } catch (error: any) {
        console.error('Error downloading video:', error);
        // Propagate the actual error message so the UI can show it
        throw new Error(error.message || 'Failed to download video');
    }
}

export async function cleanupVideo(filePath: string) {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}
