import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe, Zap, Search, Copy, Download, Check, X, ChevronDown,
  ArrowUpRight, RefreshCw, Link2, FileText, LayoutGrid, Sparkles,
  AlertCircle, Clock, ChevronRight, ExternalLink, Settings2,
  Layers, ScanLine,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  scrapeUrl, startCrawl, pollCrawl, cancelCrawl,
  type ScrapeResult, type CrawlStatus,
} from '@/integrations/firecrawl';

/* ── Tokens ─────────────────────────────────────────────────────────── */
const B      = '#09080A';
const W      = '#FFFFFF';
const CREAM  = '#FAF9F7';
const G50    = '#F5F3F0';
const G200   = '#E5E1DA';
const G500   = '#7A7470';
const AC     = '#9D7E3F';
const ACL    = '#C4A76B';
const SERIF  = "'Cormorant Garamond', Georgia, serif";

/* ── History (localStorage) ─────────────────────────────────────────── */
const HIST_KEY = 'hou-scraper-history';
interface HistoryItem { id: string; url: string; mode: string; at: string; pages: number }
function loadHistory(): HistoryItem[] {
  try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch { return []; }
}
function saveHistory(items: HistoryItem[]) { localStorage.setItem(HIST_KEY, JSON.stringify(items.slice(0, 20))); }

/* ── helpers ─────────────────────────────────────────────────────────── */
function domain(url: string) {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}
function wordCount(s?: string) {
  if (!s) return 0;
  return s.trim().split(/\s+/).length;
}

/* ─────────────────────────────────────────────────────────────────────
   Component
────────────────────────────────────────────────────────────────────── */
type Mode     = 'scrape' | 'crawl';
type TabKey   = 'markdown' | 'metadata' | 'links';

export default function WebScraper() {
  const [url,      setUrl]      = useState('');
  const [mode,     setMode]     = useState<Mode>('scrape');
  const [tab,      setTab]      = useState<TabKey>('markdown');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<ScrapeResult | null>(null);
  const [crawlData, setCrawlData] = useState<ScrapeResult['data'][] | null>(null);
  const [crawlStatus, setCrawlStatus] = useState<CrawlStatus | null>(null);
  const [crawlId,  setCrawlId]  = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [copied,   setCopied]   = useState(false);
  const [history,  setHistory]  = useState<HistoryItem[]>(loadHistory);
  const [showOpts, setShowOpts] = useState(false);

  /* Crawl options */
  const [crawlLimit, setCrawlLimit] = useState(20);
  const [crawlDepth, setCrawlDepth] = useState(3);
  const [onlyMain,   setOnlyMain]   = useState(true);

  const hasKey = !!import.meta.env.VITE_FIRECRAWL_API_KEY;

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCrawlData(null);
    setCrawlStatus(null);
    setCrawlId(null);

    const u = url.startsWith('http') ? url : `https://${url}`;

    if (mode === 'scrape') {
      const res = await scrapeUrl({ url: u, formats: ['markdown', 'links'], onlyMainContent: onlyMain });
      setLoading(false);
      if (!res.success) { setError(res.error ?? 'Scrape failed'); return; }
      setResult(res);
      addHistory({ id: crypto.randomUUID(), url: u, mode: 'Scrape', at: new Date().toISOString(), pages: 1 });
    } else {
      const crawl = await startCrawl({ url: u, limit: crawlLimit, maxDepth: crawlDepth, scrapeOptions: { formats: ['markdown', 'links'], onlyMainContent: onlyMain } });
      if (!crawl.success || !crawl.id) { setLoading(false); setError(crawl.error ?? 'Failed to start crawl'); return; }
      setCrawlId(crawl.id);
      pollCrawl(crawl.id, (s) => {
        setCrawlStatus(s);
        if (s.status === 'completed' && s.data) {
          setCrawlData(s.data);
          setLoading(false);
          addHistory({ id: crawl.id!, url: u, mode: 'Crawl', at: new Date().toISOString(), pages: s.data.length });
        }
        if (s.status === 'failed') { setLoading(false); setError(s.error ?? 'Crawl failed'); }
      });
    }
  };

  const addHistory = (item: HistoryItem) => {
    setHistory(prev => {
      const next = [item, ...prev.filter(h => h.url !== item.url)].slice(0, 20);
      saveHistory(next);
      return next;
    });
  };

  const handleCancel = async () => {
    if (crawlId) await cancelCrawl(crawlId);
    setLoading(false);
    setCrawlStatus(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  /* Active data to display */
  const activeData = crawlData?.[0] ?? result?.data;
  const allLinks   = crawlData ? crawlData.flatMap(d => d?.links ?? []) : (result?.data?.links ?? []);
  const uniqueLinks = [...new Set(allLinks)];
  const totalPages  = crawlData?.length ?? (result ? 1 : 0);
  const totalWords  = crawlData ? crawlData.reduce((a, d) => a + wordCount(d?.markdown), 0) : wordCount(result?.data?.markdown);

  return (
    <div className="min-h-screen" style={{ backgroundColor: CREAM }}>

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-8 py-4"
        style={{ backgroundColor: W, borderBottom: `1px solid ${G200}`, boxShadow: '0 1px 12px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 flex items-center justify-center" style={{ backgroundColor: 'rgba(157,126,63,0.1)' }}>
            <ScanLine className="w-4 h-4" style={{ color: AC }} strokeWidth={1.5} />
          </div>
          <div>
            <div className="text-[8px] uppercase tracking-[0.38em] font-bold" style={{ color: AC }}>HOU INC · Tools</div>
            <div className="text-[15px] font-bold" style={{ color: B }}>Web Scraper</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin" className="text-[9px] uppercase tracking-[0.22em] font-semibold px-3 py-2 transition-colors"
            style={{ border: `1px solid ${G200}`, color: G500 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = B; (e.currentTarget as HTMLElement).style.borderColor = B; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = G500; (e.currentTarget as HTMLElement).style.borderColor = G200; }}>
            ← Admin
          </Link>
          <Link to="/finance" className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] font-black px-4 py-2"
            style={{ backgroundColor: B, color: W }}>
            Finance <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
          </Link>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-8 py-8">

        {/* ── API key notice ── */}
        {!hasKey && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-5 mb-6"
            style={{ backgroundColor: 'rgba(157,126,63,0.06)', border: `1px solid rgba(157,126,63,0.25)` }}>
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: AC }} strokeWidth={1.5} />
            <div>
              <div className="text-[12px] font-bold mb-1" style={{ color: B }}>FireCrawl API key not configured</div>
              <p className="text-[11px] font-light leading-relaxed" style={{ color: G500 }}>
                Add your key to <code className="font-mono text-[10px] px-1 py-0.5" style={{ backgroundColor: G50, color: B }}>.env</code>:
                {' '}<code className="font-mono text-[10px] px-1 py-0.5" style={{ backgroundColor: G50, color: AC }}>VITE_FIRECRAWL_API_KEY="fc-..."</code>
                {' '}then restart the dev server.
                Get a key at{' '}
                <a href="https://firecrawl.dev/app/api-keys" target="_blank" rel="noreferrer"
                  className="underline" style={{ color: AC }}>firecrawl.dev/app/api-keys</a>.
              </p>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

          {/* ── Left column ── */}
          <div className="space-y-5">

            {/* ── Input card ── */}
            <div style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
              <div className="px-6 pt-5 pb-4" style={{ borderBottom: `1px solid ${G200}` }}>
                <div className="text-[10px] uppercase tracking-[0.34em] font-bold mb-4" style={{ color: AC }}>Target URL</div>

                {/* Mode toggle */}
                <div className="flex gap-px mb-5 w-fit" style={{ border: `1px solid ${G200}`, backgroundColor: G50 }}>
                  {(['scrape', 'crawl'] as Mode[]).map(m => (
                    <button key={m} onClick={() => setMode(m)}
                      className="px-5 py-2 text-[9px] uppercase tracking-[0.28em] font-bold transition-all"
                      style={{
                        backgroundColor: mode === m ? B : 'transparent',
                        color: mode === m ? W : G500,
                      }}>
                      {m === 'scrape' ? <><Zap className="w-3 h-3 inline mr-1.5" strokeWidth={2} />Single Page</> : <><Layers className="w-3 h-3 inline mr-1.5" strokeWidth={1.5} />Crawl Site</>}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleScrape}>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: G500 }} strokeWidth={1.5} />
                      <input type="text" value={url} onChange={e => setUrl(e.target.value)}
                        placeholder="https://example.com or paste any URL…"
                        className="w-full outline-none text-[13px]"
                        style={{ height: 46, padding: '0 14px 0 40px', border: `1px solid ${G200}`, borderRadius: 0, color: B, backgroundColor: G50 }}
                        onFocus={e => { e.target.style.borderColor = AC; e.target.style.backgroundColor = W; }}
                        onBlur={e => { e.target.style.borderColor = G200; e.target.style.backgroundColor = G50; }}
                      />
                    </div>
                    <button type="submit" disabled={loading || !url.trim()}
                      className="flex items-center gap-2 px-6 text-[10px] uppercase tracking-[0.28em] font-black transition-all"
                      style={{ backgroundColor: loading ? G500 : B, color: W, height: 46, opacity: !url.trim() ? 0.4 : 1, cursor: !url.trim() ? 'not-allowed' : 'pointer' }}>
                      {loading ? <><motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />Working…</> : <><Search className="w-3.5 h-3.5" strokeWidth={2.5} />{mode === 'scrape' ? 'Scrape' : 'Crawl'}</>}
                    </button>
                  </div>
                </form>
              </div>

              {/* Crawl options */}
              <div className="px-6 py-3">
                <button onClick={() => setShowOpts(o => !o)} className="flex items-center gap-2 text-[9px] uppercase tracking-[0.26em] font-bold transition-colors"
                  style={{ color: showOpts ? AC : G500 }}>
                  <Settings2 className="w-3 h-3" strokeWidth={1.5} />
                  Options
                  <motion.span animate={{ rotate: showOpts ? 180 : 0 }} transition={{ duration: 0.18 }}>
                    <ChevronDown className="w-3 h-3" strokeWidth={2} />
                  </motion.span>
                </button>
                <AnimatePresence>
                  {showOpts && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="grid grid-cols-3 gap-4 pt-4">
                        {mode === 'crawl' && <>
                          <div>
                            <label className="block text-[9px] uppercase tracking-[0.26em] font-bold mb-1.5" style={{ color: G500 }}>Page limit</label>
                            <input type="number" min={1} max={500} value={crawlLimit} onChange={e => setCrawlLimit(Number(e.target.value))}
                              className="w-full text-[13px] outline-none"
                              style={{ height: 36, padding: '0 10px', border: `1px solid ${G200}`, color: B }} />
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase tracking-[0.26em] font-bold mb-1.5" style={{ color: G500 }}>Max depth</label>
                            <input type="number" min={1} max={10} value={crawlDepth} onChange={e => setCrawlDepth(Number(e.target.value))}
                              className="w-full text-[13px] outline-none"
                              style={{ height: 36, padding: '0 10px', border: `1px solid ${G200}`, color: B }} />
                          </div>
                        </>}
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <div onClick={() => setOnlyMain(o => !o)}
                              className="w-9 h-5 relative transition-colors"
                              style={{ backgroundColor: onlyMain ? AC : G200 }}>
                              <motion.div className="absolute top-0.5 w-4 h-4" style={{ backgroundColor: W }}
                                animate={{ x: onlyMain ? 18 : 2 }} transition={{ duration: 0.18 }} />
                            </div>
                            <span className="text-[10px] font-semibold" style={{ color: B }}>Main content only</span>
                          </label>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── Crawl progress ── */}
            <AnimatePresence>
              {loading && mode === 'crawl' && crawlStatus && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="p-5 flex items-center gap-5"
                  style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                  <motion.div className="w-8 h-8 border-2 shrink-0" style={{ borderColor: G200, borderTopColor: AC }}
                    animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[11px] font-bold" style={{ color: B }}>
                        {crawlStatus.status === 'scraping' ? 'Crawling…' : crawlStatus.status}
                        {crawlStatus.completed != null && crawlStatus.total != null && (
                          <span className="font-light ml-2" style={{ color: G500 }}>{crawlStatus.completed} / {crawlStatus.total} pages</span>
                        )}
                      </div>
                      <button onClick={handleCancel} className="text-[9px] uppercase tracking-[0.2em] font-bold px-3 py-1.5"
                        style={{ border: `1px solid rgba(220,38,38,0.3)`, color: '#dc2626' }}>
                        Cancel
                      </button>
                    </div>
                    {crawlStatus.total != null && (
                      <div className="h-1 overflow-hidden" style={{ backgroundColor: G50 }}>
                        <motion.div className="h-full" style={{ backgroundColor: AC }}
                          animate={{ width: `${Math.round(((crawlStatus.completed ?? 0) / crawlStatus.total) * 100)}%` }}
                          transition={{ duration: 0.4 }} />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Error ── */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-start gap-3 p-4"
                  style={{ backgroundColor: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626' }}>
                  <X className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} />
                  <div>
                    <div className="text-[11px] font-bold mb-0.5">Scrape failed</div>
                    <div className="text-[11px] font-light">{error}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Results ── */}
            <AnimatePresence>
              {(result || crawlData) && activeData && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

                  {/* Stats bar */}
                  <div className="flex items-center gap-6 px-6 py-3.5 mb-4"
                    style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                    <div className="flex-1">
                      <div className="text-[11px] font-bold" style={{ color: B }}>{activeData.metadata?.title || domain(url)}</div>
                      <div className="text-[10px] font-light truncate" style={{ color: G500 }}>{activeData.metadata?.description?.slice(0, 100) || url}</div>
                    </div>
                    <div className="flex items-center gap-5 shrink-0">
                      {[
                        { label: 'Pages',  value: totalPages },
                        { label: 'Words',  value: totalWords.toLocaleString() },
                        { label: 'Links',  value: uniqueLinks.length },
                      ].map(s => (
                        <div key={s.label} className="text-center">
                          <div className="text-[18px] font-black" style={{ color: B, fontFamily: SERIF }}>{s.value}</div>
                          <div className="text-[8px] uppercase tracking-[0.22em] font-bold" style={{ color: G500 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tab bar */}
                  <div className="flex gap-px mb-0" style={{ borderBottom: `1px solid ${G200}` }}>
                    {(['markdown', 'metadata', 'links'] as TabKey[]).map(t => (
                      <button key={t} onClick={() => setTab(t)}
                        className="px-5 py-3 text-[9px] uppercase tracking-[0.28em] font-bold relative transition-colors"
                        style={{ color: tab === t ? B : G500, backgroundColor: W }}>
                        {t === 'markdown' && <FileText className="w-3 h-3 inline mr-1.5" strokeWidth={1.5} />}
                        {t === 'metadata' && <LayoutGrid className="w-3 h-3 inline mr-1.5" strokeWidth={1.5} />}
                        {t === 'links' && <Link2 className="w-3 h-3 inline mr-1.5" strokeWidth={1.5} />}
                        {t}
                        {tab === t && <motion.div layoutId="scraper-tab-line" className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: AC }} />}
                      </button>
                    ))}

                    <div className="ml-auto flex items-center gap-2 pr-4">
                      {tab === 'markdown' && activeData.markdown && (
                        <>
                          <button onClick={() => handleCopy(activeData.markdown!)}
                            className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] font-bold px-3 py-1.5 transition-all"
                            style={{ color: copied ? AC : G500, border: `1px solid ${copied ? AC : G200}` }}>
                            {copied ? <Check className="w-3 h-3" strokeWidth={2.5} /> : <Copy className="w-3 h-3" strokeWidth={1.5} />}
                            {copied ? 'Copied' : 'Copy'}
                          </button>
                          <button onClick={() => handleDownload(activeData.markdown!, `${domain(url)}.md`)}
                            className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] font-bold px-3 py-1.5 transition-all"
                            style={{ color: G500, border: `1px solid ${G200}` }}>
                            <Download className="w-3 h-3" strokeWidth={1.5} /> .md
                          </button>
                        </>
                      )}
                      {tab === 'links' && uniqueLinks.length > 0 && (
                        <button onClick={() => handleDownload(uniqueLinks.join('\n'), `${domain(url)}-links.txt`)}
                          className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] font-bold px-3 py-1.5"
                          style={{ color: G500, border: `1px solid ${G200}` }}>
                          <Download className="w-3 h-3" strokeWidth={1.5} /> Links .txt
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tab content */}
                  <div style={{ backgroundColor: W, border: `1px solid ${G200}`, borderTop: 'none' }}>

                    {tab === 'markdown' && (
                      <div className="overflow-auto" style={{ maxHeight: '60vh' }}>
                        {crawlData && crawlData.length > 1 && (
                          <div className="px-6 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${G200}`, backgroundColor: G50 }}>
                            <span className="text-[9px] uppercase tracking-[0.24em] font-bold" style={{ color: G500 }}>Showing page 1 of {crawlData.length} — all pages available in download</span>
                          </div>
                        )}
                        {activeData.markdown ? (
                          <pre className="px-6 py-5 text-[12px] font-mono whitespace-pre-wrap break-words leading-relaxed" style={{ color: B }}>
                            {activeData.markdown}
                          </pre>
                        ) : (
                          <div className="px-6 py-12 text-center text-[12px] font-light" style={{ color: G500 }}>No markdown content extracted.</div>
                        )}
                      </div>
                    )}

                    {tab === 'metadata' && (
                      <div className="divide-y" style={{ borderColor: G200, maxHeight: '60vh', overflow: 'auto' }}>
                        {activeData.metadata ? (
                          Object.entries(activeData.metadata).filter(([, v]) => v != null && v !== '').map(([k, v]) => (
                            <div key={k} className="flex gap-6 px-6 py-3.5">
                              <div className="w-36 shrink-0 text-[9px] uppercase tracking-[0.22em] font-bold pt-0.5" style={{ color: G500 }}>{k}</div>
                              <div className="flex-1 text-[12px] break-words" style={{ color: B }}>{String(v)}</div>
                            </div>
                          ))
                        ) : (
                          <div className="px-6 py-12 text-center text-[12px] font-light" style={{ color: G500 }}>No metadata available.</div>
                        )}
                      </div>
                    )}

                    {tab === 'links' && (
                      <div className="overflow-auto" style={{ maxHeight: '60vh' }}>
                        {uniqueLinks.length > 0 ? (
                          uniqueLinks.map((link, i) => (
                            <div key={i} className="flex items-center gap-3 px-6 py-2.5"
                              style={{ borderBottom: i < uniqueLinks.length - 1 ? `1px solid ${G50}` : 'none' }}>
                              <Link2 className="w-3 h-3 shrink-0" style={{ color: G500 }} strokeWidth={1.5} />
                              <span className="flex-1 text-[11px] font-light truncate" style={{ color: B }}>{link}</span>
                              <a href={link} target="_blank" rel="noreferrer"
                                className="shrink-0 transition-colors" style={{ color: G500 }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = AC; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = G500; }}>
                                <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                              </a>
                            </div>
                          ))
                        ) : (
                          <div className="px-6 py-12 text-center text-[12px] font-light" style={{ color: G500 }}>No links extracted.</div>
                        )}
                      </div>
                    )}
                  </div>

                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state */}
            {!loading && !result && !crawlData && !error && (
              <div className="flex flex-col items-center justify-center py-20 text-center"
                style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                <div className="w-14 h-14 flex items-center justify-center mb-5" style={{ backgroundColor: G50, border: `1px solid ${G200}` }}>
                  <Globe className="w-6 h-6" style={{ color: G500 }} strokeWidth={1} />
                </div>
                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 24, color: B, marginBottom: 8 }}>
                  Ready to scrape
                </div>
                <p className="text-[12px] font-light max-w-xs leading-relaxed" style={{ color: G500 }}>
                  Enter any URL above to extract clean markdown, metadata, and links — instantly.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  {['https://houinc.com', 'https://constructors.com', 'https://buildwithus.com'].map(eg => (
                    <button key={eg} onClick={() => setUrl(eg)}
                      className="text-[10px] px-3 py-1.5 transition-all font-mono"
                      style={{ border: `1px solid ${G200}`, color: G500 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = AC; (e.currentTarget as HTMLElement).style.color = AC; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = G200; (e.currentTarget as HTMLElement).style.color = G500; }}>
                      {eg}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right column: History ── */}
          <div className="space-y-4">
            <div style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${G200}` }}>
                <div className="text-[9px] uppercase tracking-[0.32em] font-bold" style={{ color: AC }}>Recent Scrapes</div>
                {history.length > 0 && (
                  <button onClick={() => { setHistory([]); localStorage.removeItem(HIST_KEY); }}
                    className="text-[8px] uppercase tracking-[0.2em] font-semibold" style={{ color: G500 }}>Clear</button>
                )}
              </div>
              {history.length === 0 ? (
                <div className="px-5 py-8 text-center text-[11px] font-light" style={{ color: G500 }}>No history yet.</div>
              ) : (
                history.map((h, i) => (
                  <button key={h.id} onClick={() => setUrl(h.url)}
                    className="w-full flex items-start gap-3 px-5 py-3.5 text-left transition-colors"
                    style={{ borderBottom: i < history.length - 1 ? `1px solid ${G50}` : 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = G50; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}>
                    <div className="w-6 h-6 flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: 'rgba(157,126,63,0.1)' }}>
                      {h.mode === 'Crawl' ? <Layers className="w-3 h-3" style={{ color: AC }} strokeWidth={1.5} /> : <Zap className="w-3 h-3" style={{ color: AC }} strokeWidth={2} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold truncate" style={{ color: B }}>{domain(h.url)}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[8px] uppercase tracking-[0.18em] font-bold px-1.5 py-0.5"
                          style={{ backgroundColor: 'rgba(157,126,63,0.08)', color: AC }}>{h.mode}</span>
                        <span className="text-[9px] font-light" style={{ color: G500 }}>{h.pages}p</span>
                        <span className="text-[9px] font-light" style={{ color: G500 }}>
                          {new Date(h.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3 h-3 shrink-0 mt-1" style={{ color: G500 }} strokeWidth={1.5} />
                  </button>
                ))
              )}
            </div>

            {/* Tips card */}
            <div className="p-5" style={{ backgroundColor: 'rgba(157,126,63,0.04)', border: `1px solid rgba(157,126,63,0.18)` }}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-3 h-3" style={{ color: ACL }} strokeWidth={1.5} />
                <div className="text-[9px] uppercase tracking-[0.3em] font-bold" style={{ color: ACL }}>Pro Tips</div>
              </div>
              <ul className="space-y-2">
                {[
                  'Use Single Page for fast data extraction from one URL',
                  'Use Crawl Site to map an entire domain — set a page limit to control cost',
                  '"Main content only" strips headers, footers, and nav for cleaner output',
                  'Download as .md to feed directly into AI tools or reports',
                  'Extracted links can be used as a sitemap or for competitive analysis',
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-[10px] font-light leading-relaxed" style={{ color: G500 }}>
                    <span className="shrink-0 mt-1 w-1 h-1 rounded-full" style={{ backgroundColor: ACL }} />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
