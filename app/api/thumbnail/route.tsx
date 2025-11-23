import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title') || 'AI Remix';

    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#0f172a', // slate-900
                    backgroundImage: 'linear-gradient(to bottom right, #0f172a, #1e293b)',
                    color: 'white',
                    fontFamily: 'sans-serif',
                    padding: '40px',
                    textAlign: 'center',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '40px',
                    }}
                >
                    {/* Abstract Brain Icon */}
                    <svg
                        width="80"
                        height="80"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#3b82f6" // blue-500
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
                        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
                    </svg>
                </div>
                <div
                    style={{
                        fontSize: 60,
                        fontWeight: 800,
                        background: 'linear-gradient(to right, #60a5fa, #a78bfa)', // blue-400 to violet-400
                        backgroundClip: 'text',
                        color: 'transparent',
                        lineHeight: 1.2,
                        marginBottom: '20px',
                    }}
                >
                    {title}
                </div>
                <div
                    style={{
                        fontSize: 24,
                        color: '#94a3b8', // slate-400
                        marginTop: '20px',
                    }}
                >
                    AUDREY REMIX SYSTEM
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 1200,
        },
    );
}
