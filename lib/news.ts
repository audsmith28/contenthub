import Parser from 'rss-parser';

const parser = new Parser();

export interface NewsItem {
    title: string;
    link: string;
    pubDate: string;
    source: string;
    summary?: string;
}

const AI_NEWS_FEEDS = [
    { url: 'https://news.google.com/rss/search?q=artificial+intelligence+when:1d&hl=en-US&gl=US&ceid=US:en', source: 'Google News' },
    { url: 'https://hnrss.org/newest?q=AI+OR+machine+learning', source: 'Hacker News' },
    { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', source: 'TechCrunch' },
];

export async function fetchAINews(): Promise<NewsItem[]> {
    const allNews: NewsItem[] = [];

    for (const feed of AI_NEWS_FEEDS) {
        try {
            const parsed = await parser.parseURL(feed.url);
            const items = parsed.items.slice(0, 5).map(item => ({
                title: item.title || 'Untitled',
                link: item.link || '',
                pubDate: item.pubDate || new Date().toISOString(),
                source: feed.source,
                summary: item.contentSnippet || item.content?.substring(0, 200) || '',
            }));
            allNews.push(...items);
        } catch (error) {
            console.error(`Failed to fetch ${feed.source}:`, error);
        }
    }

    // Sort by date (newest first) and return top 10
    return allNews
        .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
        .slice(0, 10);
}
