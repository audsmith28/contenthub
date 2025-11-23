import fs from 'fs';
import path from 'path';

const DATA_ROOT = process.env.DATA_DIR || (process.env.VERCEL ? '/tmp/astral-data' : path.join(process.cwd(), 'data'));
const DB_PATH = path.join(DATA_ROOT, 'remixes.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// Initialize db if not exists
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2));
}

export async function saveRemix(remixData: any) {
    try {
        const fileContent = fs.readFileSync(DB_PATH, 'utf-8');
        const db = JSON.parse(fileContent);

        const newEntry = {
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            ...remixData
        };

        db.unshift(newEntry); // Add to top

        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        console.log(`Saved remix ${newEntry.id} to db.json`);
        return newEntry;
    } catch (error) {
        console.error("Error saving to db:", error);
        // Don't fail the request if saving fails
        return null;
    }
}

export async function getRemixes() {
    try {
        if (!fs.existsSync(DB_PATH)) return [];
        const fileContent = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        return [];
    }
}
