"use client"

import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { remixVideo, shareToLinkedIn, getAINews, remixArticle, regenerateLinkedInPost, listCreators, createCreator, deleteCreator, scanCreatorVideos, batchRemixVideos, scanAllCreators } from "./actions"
import { Loader2, Sparkles, Copy, Video, FileVideo, Linkedin, CheckCircle2, Newspaper } from "lucide-react"
import { toast } from "sonner"

type Mode = "video" | "news" | "creators" | "queue";

export default function Home() {
  const [mode, setMode] = useState<Mode>("video")
  const [url, setUrl] = useState("")
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<any>(null)
  const [news, setNews] = useState<any[]>([])
  const [loadingNews, setLoadingNews] = useState(false)
  const [style, setStyle] = useState<'punchy' | 'explainer' | 'deepdive'>('punchy')
  const [generationModel, setGenerationModel] = useState<'gemini' | 'nano'>('gemini')
  const [linkedinStyle, setLinkedinStyle] = useState<'thought_leader' | 'data_driven' | 'story_driven' | 'hot_take'>('thought_leader')
  const [regeneratingLinkedIn, setRegeneratingLinkedIn] = useState(false)
  const [creators, setCreators] = useState<any[]>([])
  const [creatorVideos, setCreatorVideos] = useState<any[]>([])
  const [loadingCreators, setLoadingCreators] = useState(false)
  const [newCreatorUrl, setNewCreatorUrl] = useState("")
  const [newCreatorName, setNewCreatorName] = useState("")
  const [selectedVideos, setSelectedVideos] = useState<string[]>([])
  const [batchProcessing, setBatchProcessing] = useState(false)
  const [allCreatorVideos, setAllCreatorVideos] = useState<any[]>([])
  const [scanningAll, setScanningAll] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return

    startTransition(async () => {
      const formData = new FormData()
      formData.append("url", url)
      formData.append("style", style)
      formData.append("model", generationModel)

      try {
        const response = await remixVideo(formData)
        if (response.error) {
          toast.error(response.error)
        } else {
          setResult(response)
          toast.success("Remix complete!")
        }
      } catch (err) {
        toast.error("An unexpected error occurred")
      }
    })
  }

  const handleLinkedInShare = async () => {
    if (!result?.data?.audrey_remix?.linkedin_post) return;

    const promise = shareToLinkedIn(
      result.data.audrey_remix.linkedin_post,
      result.data.audrey_remix.linkedin_image
    );

    toast.promise(promise, {
      loading: 'Posting to LinkedIn...',
      success: 'Posted successfully!',
      error: (err: any) => `Failed to post: ${err.message || 'Unknown error'}`
    });
  };

  const handleScanNews = async () => {
    setLoadingNews(true);
    const response = await getAINews();
    if (response.success) {
      setNews(response.data ?? []);
    } else {
      toast.error("Failed to fetch news");
    }
    setLoadingNews(false);
  };

  const handleRemixArticle = (articleUrl: string, articleTitle: string) => {
    startTransition(async () => {
      const response = await remixArticle(articleUrl, articleTitle, style, generationModel);
      setResult(response);
    });
  };

  const handleRegenerateLinkedIn = async () => {
    if (!result?.data) return;

    setRegeneratingLinkedIn(true);
    const sourceContent = JSON.stringify(result.data.source_metadata);
    const response = await regenerateLinkedInPost(sourceContent, linkedinStyle);

    if (response.success) {
      setResult({
        ...result,
        data: {
          ...result.data,
          audrey_remix: response.data
        }
      });
      toast.success('LinkedIn post regenerated!');
    } else {
      toast.error('Failed to regenerate');
    }
    setRegeneratingLinkedIn(false);
  };

  const handleLoadCreators = async () => {
    const response = await listCreators();
    if (response.success) {
      setCreators(response.data || []);
    }
  };

  const handleAddCreator = async () => {
    if (!newCreatorUrl || !newCreatorName) {
      toast.error('Please provide both URL and name');
      return;
    }
    const response = await createCreator(newCreatorUrl, newCreatorName);
    if (response.success) {
      toast.success('Creator added!');
      setNewCreatorUrl('');
      setNewCreatorName('');
      handleLoadCreators();
    } else {
      toast.error(response.error || 'Failed to add creator');
    }
  };

  const handleDeleteCreator = async (id: string) => {
    const response = await deleteCreator(id);
    if (response.success) {
      toast.success('Creator removed');
      handleLoadCreators();
    }
  };

  const handleScanCreator = async (channelId: string) => {
    setLoadingCreators(true);
    const response = await scanCreatorVideos(channelId);
    if (response.success) {
      setCreatorVideos(response.data || []);
    } else {
      toast.error('Failed to scan videos');
    }
    setLoadingCreators(false);
  };

  const handleToggleVideo = (videoUrl: string) => {
    setSelectedVideos(prev =>
      prev.includes(videoUrl)
        ? prev.filter(url => url !== videoUrl)
        : [...prev, videoUrl]
    );
  };

  const handleBatchRemix = async () => {
    if (selectedVideos.length === 0) {
      toast.error('Please select at least one video');
      return;
    }

    setBatchProcessing(true);
    const promise = batchRemixVideos(selectedVideos, style, generationModel);

    toast.promise(promise, {
      loading: `Processing ${selectedVideos.length} videos...`,
      success: (result: any) => {
        setSelectedVideos([]);
        return `Completed ${result.data.completed}/${result.data.total} videos!`;
      },
      error: 'Batch processing failed'
    });

    await promise;
    setBatchProcessing(false);
  };

  const handleScanAllCreators = async () => {
    setScanningAll(true);
    const result = await scanAllCreators(10);
    if (result.success && result.data) {
      setAllCreatorVideos(result.data);
      toast.success(`Found ${result.data.length} videos across all creators!`);
    } else {
      toast.error(result.error || 'Failed to scan creators');
    }
    setScanningAll(false);
  };

  return (
    <main className="min-h-screen bg-background p-8 md:p-24 font-sans">
      <div className="max-w-3xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-primary">
            Audrey Remix System
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Paste a video URL. Get an elite content pack. Lazy but ruthless.
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2 justify-center">
          <Button
            variant={mode === "video" ? "default" : "outline"}
            onClick={() => setMode("video")}
            className="gap-2"
          >
            <Video className="w-4 h-4" />
            Video Mode
          </Button>
          <Button
            variant={mode === "news" ? "default" : "outline"}
            onClick={() => setMode("news")}
            className="gap-2"
          >
            <Newspaper className="w-4 h-4" />
            News Mode
          </Button>
          <Button
            variant={mode === "creators" ? "default" : "outline"}
            onClick={() => { setMode("creators"); handleLoadCreators(); }}
            className="gap-2"
          >
            <Video className="w-4 h-4" />
            My Creators
          </Button>
        </div>

        {/* Video Mode */}
        {mode === "video" && (
          <Card className="border-2 border-primary/10 shadow-lg">
            <CardHeader>
              <CardTitle>Input Source</CardTitle>
              <CardDescription>
                Supports YouTube, TikTok, Instagram Reels, and Shorts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Script Style</label>
                <Select value={style} onChange={(e) => setStyle(e.target.value as any)}>
                  <option value="punchy">⚡ Punchy (30-60s) - Fast, direct, scroll-stopping</option>
                  <option value="explainer">📚 Explainer (90-120s) - Step-by-step teaching</option>
                  <option value="deepdive">🎓 Deep Dive (3-5min) - Tutorial with examples</option>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Generation Model</label>
                <Select value={generationModel} onChange={(e) => setGenerationModel(e.target.value as any)}>
                  <option value="gemini">🧠 Gemini (High Quality)</option>
                  <option value="nano">⚡ Nano Banana (Fast & Cheap)</option>
                </Select>
              </div>
              <form onSubmit={handleSubmit} className="flex gap-4">
                <Input
                  placeholder="https://www.instagram.com/reel/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 text-lg h-12"
                />
                <Button
                  type="submit"
                  size="lg"
                  disabled={isPending || !url}
                  className="h-12 px-8 text-lg"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Remixing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Remix
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* News Mode */}
        {mode === "news" && (
          <Card className="border-2 border-primary/10 shadow-lg">
            <CardHeader>
              <CardTitle>AI News Scanner</CardTitle>
              <CardDescription>
                Scan top AI news and generate content packs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Script Style</label>
                <Select value={style} onChange={(e) => setStyle(e.target.value as any)}>
                  <option value="punchy">⚡ Punchy (30-60s) - Fast, direct, scroll-stopping</option>
                  <option value="explainer">📚 Explainer (90-120s) - Step-by-step teaching</option>
                  <option value="deepdive">🎓 Deep Dive (3-5min) - Tutorial with examples</option>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Generation Model</label>
                <Select value={generationModel} onChange={(e) => setGenerationModel(e.target.value as any)}>
                  <option value="gemini">🧠 Gemini (High Quality)</option>
                  <option value="nano">⚡ Nano Banana (Fast & Cheap)</option>
                </Select>
              </div>
              <Button
                onClick={handleScanNews}
                disabled={loadingNews}
                className="w-full"
                size="lg"
              >
                {loadingNews ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Newspaper className="mr-2 h-5 w-5" />
                    Scan AI News
                  </>
                )}
              </Button>

              {news.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {news.map((item, i) => (
                    <Card key={i} className="p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                          <p className="text-xs text-muted-foreground mb-2">{item.source} • {new Date(item.pubDate).toLocaleDateString()}</p>
                          {item.summary && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleRemixArticle(item.link, item.title)}
                          disabled={isPending}
                        >
                          <Sparkles className="mr-1 h-3 w-3" />
                          Remix
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Creators Mode */}
        {mode === "creators" && (
          <Card className="border-2 border-primary/10 shadow-lg">
            <CardHeader>
              <CardTitle>My Creator Library</CardTitle>
              <CardDescription>
                Save your favorite AI creators and scan their top videos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-semibold">Add New Creator</h3>
                <div className="flex gap-2">
                  <Input
                    placeholder="Creator name"
                    value={newCreatorName}
                    onChange={(e) => setNewCreatorName(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="YouTube channel URL"
                    value={newCreatorUrl}
                    onChange={(e) => setNewCreatorUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleAddCreator}>Add</Button>
                </div>
              </div>

              {/* Scan All Creators Button */}
              <div className="space-y-3">
                <Button
                  onClick={handleScanAllCreators}
                  disabled={scanningAll || creators.length === 0}
                  className="w-full gap-2"
                  variant="outline"
                >
                  {scanningAll ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Scanning All Creators...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Scan All Creators ({creators.length})
                    </>
                  )}
                </Button>
              </div>

              {creators.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Saved Creators ({creators.length})</h3>
                  {creators.map((creator: any) => (
                    <Card key={creator.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{creator.name}</h4>
                          <p className="text-xs text-muted-foreground">{creator.platform}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleScanCreator(creator.channelId)} disabled={loadingCreators}>
                            {loadingCreators ? 'Scanning...' : 'Scan Videos'}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteCreator(creator.id)}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {creatorVideos.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Top Videos ({creatorVideos.length})</h3>
                    {selectedVideos.length > 0 && (
                      <Button
                        onClick={handleBatchRemix}
                        disabled={batchProcessing}
                        className="gap-2"
                      >
                        {batchProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing {selectedVideos.length}...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Batch Remix ({selectedVideos.length})
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {creatorVideos.map((video: any) => (
                      <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="relative">
                          <img src={video.thumbnail} alt={video.title} className="w-full aspect-video object-cover" />
                          <input
                            type="checkbox"
                            checked={selectedVideos.includes(video.url)}
                            onChange={() => handleToggleVideo(video.url)}
                            className="absolute top-2 left-2 w-5 h-5 cursor-pointer"
                          />
                        </div>
                        <CardContent className="p-3 space-y-2">
                          <h4 className="font-medium text-sm line-clamp-2">{video.title}</h4>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{(video.views / 1000).toFixed(0)}K views</span>
                          </div>
                          <Button size="sm" className="w-full" onClick={() => { setUrl(video.url); setMode("video"); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                            <Sparkles className="mr-2 h-3 w-3" />
                            Remix This
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Combined Video Grid from All Creators */}
              {allCreatorVideos.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">All Creator Videos ({allCreatorVideos.length})</h3>
                    {selectedVideos.length > 0 && (
                      <Button
                        onClick={handleBatchRemix}
                        disabled={batchProcessing}
                        className="gap-2"
                      >
                        {batchProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing {selectedVideos.length}...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Batch Remix ({selectedVideos.length})
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {allCreatorVideos.map((video: any) => (
                      <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="relative">
                          <img src={video.thumbnail} alt={video.title} className="w-full aspect-video object-cover" />
                          <input
                            type="checkbox"
                            checked={selectedVideos.includes(video.url)}
                            onChange={() => handleToggleVideo(video.url)}
                            className="absolute top-2 left-2 w-5 h-5 cursor-pointer"
                          />
                          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {video.channelName}
                          </div>
                        </div>
                        <CardContent className="p-3 space-y-2">
                          <h4 className="font-medium text-sm line-clamp-2">{video.title}</h4>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{(video.views / 1000).toFixed(0)}K views</span>
                          </div>
                          <Button size="sm" className="w-full" onClick={() => { setUrl(video.url); setMode("video"); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                            <Sparkles className="mr-2 h-3 w-3" />
                            Remix This
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {result && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Content Pack</h2>
              <Button variant="outline" size="sm">
                <Copy className="mr-2 h-4 w-4" />
                Copy All
              </Button>
            </div>

            <div className="grid gap-6">
              {/* Hooks */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-primary">Hooks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.data?.audrey_remix?.hooks?.map((hook: string, i: number) => (
                    <div key={i} className="p-3 bg-muted rounded-md font-medium">
                      {hook}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* A/B Testing Variants */}
              {result.data?.audrey_remix?.hook_variants && (
                <Card className="border-2 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg text-primary flex items-center gap-2">
                      🎯 A/B Testing Variants
                      <span className="text-xs font-normal text-muted-foreground">(Test these to find your winner)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Hook Variants */}
                    <div>
                      <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide">Hook Variants</h4>
                      <div className="grid gap-3">
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Pattern Interrupt</div>
                          <div className="font-medium">{result.data.audrey_remix.hook_variants.pattern_interrupt}</div>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-md border border-purple-200 dark:border-purple-800">
                          <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">Curiosity Gap</div>
                          <div className="font-medium">{result.data.audrey_remix.hook_variants.curiosity_gap}</div>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
                          <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">Social Proof</div>
                          <div className="font-medium">{result.data.audrey_remix.hook_variants.social_proof}</div>
                        </div>
                      </div>
                    </div>

                    {/* Thumbnail Variants */}
                    <div>
                      <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide">Thumbnail Headline Variants</h4>
                      <div className="grid gap-2">
                        <div className="p-2 bg-muted rounded-md flex items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">Benefit:</span>
                          <span className="font-medium">{result.data.audrey_remix.thumbnail_variants.benefit_focused}</span>
                        </div>
                        <div className="p-2 bg-muted rounded-md flex items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">Curiosity:</span>
                          <span className="font-medium">{result.data.audrey_remix.thumbnail_variants.curiosity_focused}</span>
                        </div>
                        <div className="p-2 bg-muted rounded-md flex items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">Authority:</span>
                          <span className="font-medium">{result.data.audrey_remix.thumbnail_variants.authority_focused}</span>
                        </div>
                      </div>
                    </div>

                    {/* CTA Variants */}
                    <div>
                      <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide">CTA Variants</h4>
                      <div className="grid gap-2">
                        <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-md border border-orange-200 dark:border-orange-800">
                          <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1">Direct Action</div>
                          <div className="font-medium">{result.data.audrey_remix.cta_variants.direct_action}</div>
                        </div>
                        <div className="p-3 bg-pink-50 dark:bg-pink-950/20 rounded-md border border-pink-200 dark:border-pink-800">
                          <div className="text-xs font-semibold text-pink-600 dark:text-pink-400 mb-1">Engagement-Focused</div>
                          <div className="font-medium">{result.data.audrey_remix.cta_variants.engagement_focused}</div>
                        </div>
                      </div>
                    </div>

                    {/* Performance Tags */}
                    {result.data.audrey_remix.performance_tags && (
                      <div className="pt-4 border-t">
                        <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide">Performance Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                            {result.data.audrey_remix.performance_tags.content_type}
                          </span>
                          <span className="px-3 py-1 bg-secondary/10 text-secondary-foreground rounded-full text-xs font-medium">
                            {result.data.audrey_remix.performance_tags.emotional_trigger}
                          </span>
                          <span className="px-3 py-1 bg-accent/10 text-accent-foreground rounded-full text-xs font-medium">
                            {result.data.audrey_remix.performance_tags.topic_cluster}
                          </span>
                          <span className="px-3 py-1 bg-muted rounded-full text-xs font-medium">
                            {result.data.audrey_remix.performance_tags.complexity_level}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Performance Hypothesis */}
                    {result.data.audrey_remix.performance_hypothesis && (
                      <div className="pt-4 border-t">
                        <h4 className="font-semibold mb-2 text-sm uppercase tracking-wide">Performance Hypothesis</h4>
                        <p className="text-sm text-muted-foreground italic">{result.data.audrey_remix.performance_hypothesis}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Script */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-primary">Script</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                    {result.data?.audrey_remix?.short_script}
                  </div>
                </CardContent>
              </Card>

              {/* LinkedIn Post */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg text-primary">LinkedIn Post</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleLinkedInShare}>
                    <Linkedin className="mr-2 h-4 w-4" />
                    Post to LinkedIn
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">LinkedIn Style</label>
                    <div className="flex gap-2">
                      <Select
                        value={linkedinStyle}
                        onChange={(e) => setLinkedinStyle(e.target.value as any)}
                        className="flex-1"
                      >
                        <option value="thought_leader">🎯 Thought Leader - Bold, contrarian</option>
                        <option value="data_driven">📊 Data-Driven - Stats-heavy, credible</option>
                        <option value="story_driven">💡 Story-Driven - Personal, relatable</option>
                        <option value="hot_take">🔥 Hot Take - Provocative, debate-starter</option>
                      </Select>
                      <Button
                        onClick={handleRegenerateLinkedIn}
                        disabled={regeneratingLinkedIn}
                        size="sm"
                      >
                        {regeneratingLinkedIn ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Regenerating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Regenerate
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                    {result.data?.audrey_remix?.linkedin_post}
                    {result.data?.audrey_remix?.linkedin_image && (
                      <img
                        src={result.data?.audrey_remix?.linkedin_image}
                        alt="LinkedIn thumbnail"
                        className="mt-4 rounded-md max-w-full"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* CTA */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-primary">Call to Action</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 border border-primary/20 bg-primary/5 rounded-md text-center font-bold text-lg">
                    {result.data?.audrey_remix?.cta}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
