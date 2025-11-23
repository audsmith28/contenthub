// Nano Banana wrapper – simple HTTP POST to a local or remote endpoint
// Returns the generated text (or image URL) from the service.

export async function generate(prompt: string, opts: { maxTokens?: number } = {}): Promise<string> {
    const url = process.env.NANO_BANANA_URL;
    if (!url) {
        throw new Error('NANO_BANANA_URL is not set in .env.local');
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt,
            max_tokens: opts.maxTokens ?? 256
        })
    });

    if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Nano Banana request failed: ${response.status} ${txt}`);
    }

    const data = await response.json();
    // Expect the service to return { text: "..." }
    return data.text as string;
}
