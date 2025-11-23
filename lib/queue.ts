import fs from 'fs';
import path from 'path';

const QUEUE_PATH = path.join(process.cwd(), 'data', 'queue.json');

export interface QueueItem {
    id: string;
    url: string;
    sourceType: 'video' | 'article' | 'creator';
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'scheduled';
    platform?: 'linkedin' | 'twitter' | 'both';
    contentPack?: any;
    error?: string;
    createdAt: string;
    completedAt?: string;
    scheduledFor?: string;
    postedAt?: string;
}

// Ensure queue.json exists
if (!fs.existsSync(QUEUE_PATH)) {
    fs.writeFileSync(QUEUE_PATH, JSON.stringify([], null, 2));
}

export async function getQueue(): Promise<QueueItem[]> {
    try {
        const fileContent = fs.readFileSync(QUEUE_PATH, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        return [];
    }
}

export async function addToQueue(item: Omit<QueueItem, 'id' | 'createdAt' | 'status'>): Promise<QueueItem> {
    const queue = await getQueue();

    const newItem: QueueItem = {
        ...item,
        id: crypto.randomUUID(),
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    queue.push(newItem);
    fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2));

    return newItem;
}

export async function updateQueueItem(id: string, updates: Partial<QueueItem>): Promise<void> {
    const queue = await getQueue();
    const index = queue.findIndex(item => item.id === id);

    if (index !== -1) {
        queue[index] = { ...queue[index], ...updates };
        fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2));
    }
}

export async function removeFromQueue(id: string): Promise<void> {
    const queue = await getQueue();
    const filtered = queue.filter(item => item.id !== id);
    fs.writeFileSync(QUEUE_PATH, JSON.stringify(filtered, null, 2));
}

export async function getQueueStats() {
    const queue = await getQueue();
    return {
        total: queue.length,
        pending: queue.filter(i => i.status === 'pending').length,
        processing: queue.filter(i => i.status === 'processing').length,
        completed: queue.filter(i => i.status === 'completed').length,
        failed: queue.filter(i => i.status === 'failed').length,
        scheduled: queue.filter(i => i.status === 'scheduled').length
    };
}

export async function scheduleQueueItem(id: string, scheduledFor: string, platform: 'linkedin' | 'twitter' | 'both' = 'linkedin'): Promise<void> {
    await updateQueueItem(id, {
        status: 'scheduled',
        scheduledFor,
        platform
    });
}

export async function getScheduledItems(): Promise<QueueItem[]> {
    const queue = await getQueue();
    return queue
        .filter(item => item.status === 'scheduled')
        .sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime());
}

export async function getCompletedItems(): Promise<QueueItem[]> {
    const queue = await getQueue();
    return queue
        .filter(item => item.status === 'completed')
        .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
}
