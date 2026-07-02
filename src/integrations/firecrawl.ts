/* FireCrawl REST client — works entirely in-browser, no Node SDK needed */

const BASE = 'https://api.firecrawl.dev/v1';

function apiKey(): string {
  return import.meta.env.VITE_FIRECRAWL_API_KEY ?? '';
}

function headers(): Record<string, string> {
  return {
    'Authorization': `Bearer ${apiKey()}`,
    'Content-Type': 'application/json',
  };
}

/* ── Types ───────────────────────────────────────────────────────────── */

export interface ScrapeOptions {
  url: string;
  formats?: ('markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot' | 'extract')[];
  onlyMainContent?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
  waitFor?: number;
  timeout?: number;
}

export interface ScrapeResult {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    rawHtml?: string;
    links?: string[];
    metadata?: {
      title?: string;
      description?: string;
      language?: string;
      keywords?: string;
      ogTitle?: string;
      ogDescription?: string;
      ogImage?: string;
      sourceURL?: string;
      statusCode?: number;
    };
    screenshot?: string;
  };
  error?: string;
}

export interface CrawlOptions {
  url: string;
  limit?: number;
  scrapeOptions?: {
    formats?: ScrapeOptions['formats'];
    onlyMainContent?: boolean;
  };
  includePaths?: string[];
  excludePaths?: string[];
  maxDepth?: number;
}

export interface CrawlStatus {
  status: 'scraping' | 'completed' | 'failed' | 'cancelled';
  total?: number;
  completed?: number;
  creditsUsed?: number;
  expiresAt?: string;
  data?: ScrapeResult['data'][];
  error?: string;
}

export interface ExtractOptions {
  urls: string[];
  prompt: string;
  schema?: Record<string, unknown>;
}

export interface ExtractResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

/* ── Scrape a single URL ────────────────────────────────────────────── */

export async function scrapeUrl(opts: ScrapeOptions): Promise<ScrapeResult> {
  const key = apiKey();
  if (!key) return { success: false, error: 'No FireCrawl API key configured. Add VITE_FIRECRAWL_API_KEY to your .env file.' };

  const res = await fetch(`${BASE}/scrape`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      url: opts.url,
      formats: opts.formats ?? ['markdown', 'links'],
      onlyMainContent: opts.onlyMainContent ?? true,
      includeTags: opts.includeTags,
      excludeTags: opts.excludeTags,
      waitFor: opts.waitFor,
      timeout: opts.timeout ?? 30000,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { success: false, error: (err as any).error ?? `HTTP ${res.status}` };
  }
  return res.json();
}

/* ── Start a crawl job ──────────────────────────────────────────────── */

export async function startCrawl(opts: CrawlOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  const key = apiKey();
  if (!key) return { success: false, error: 'No FireCrawl API key configured.' };

  const res = await fetch(`${BASE}/crawl`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      url: opts.url,
      limit: opts.limit ?? 25,
      maxDepth: opts.maxDepth ?? 3,
      includePaths: opts.includePaths,
      excludePaths: opts.excludePaths,
      scrapeOptions: opts.scrapeOptions ?? { formats: ['markdown', 'links'], onlyMainContent: true },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { success: false, error: (err as any).error ?? `HTTP ${res.status}` };
  }
  return res.json();
}

/* ── Poll crawl status ──────────────────────────────────────────────── */

export async function getCrawlStatus(id: string): Promise<CrawlStatus> {
  const res = await fetch(`${BASE}/crawl/${id}`, { headers: headers() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { status: 'failed', error: (err as any).error ?? `HTTP ${res.status}` };
  }
  return res.json();
}

/* ── Cancel a crawl ─────────────────────────────────────────────────── */

export async function cancelCrawl(id: string): Promise<void> {
  await fetch(`${BASE}/crawl/${id}`, { method: 'DELETE', headers: headers() });
}

/* ── Extract structured data via LLM ────────────────────────────────── */

export async function extract(opts: ExtractOptions): Promise<ExtractResult> {
  const key = apiKey();
  if (!key) return { success: false, error: 'No FireCrawl API key configured.' };

  const res = await fetch(`${BASE}/extract`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ urls: opts.urls, prompt: opts.prompt, schema: opts.schema }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { success: false, error: (err as any).error ?? `HTTP ${res.status}` };
  }
  return res.json();
}

/* ── Poll helper — resolves when crawl is done or returns on timeout ── */

export async function pollCrawl(
  id: string,
  onProgress?: (status: CrawlStatus) => void,
  intervalMs = 2500,
  maxWaitMs = 120_000,
): Promise<CrawlStatus> {
  const deadline = Date.now() + maxWaitMs;
  return new Promise(resolve => {
    const tick = async () => {
      const status = await getCrawlStatus(id);
      onProgress?.(status);
      if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
        resolve(status);
        return;
      }
      if (Date.now() >= deadline) { resolve(status); return; }
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}
