import { useEffect, useState } from 'react';
import { Newspaper, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';
import api from '../utils/api';
import useStore from '../store/useStore';
import { Badge, Button, EmptyState, PageHeader } from '../components/ui';
import { SkeletonBox } from '../components/Skeleton';
import { cn } from '../lib/cn';
import { decodeEntities, timeAgo } from '../lib/format';

/** Sections in reading order, with the tone their heading and count use. */
const SECTIONS = [
  { key: 'POSITIVE', label: 'Positive', variant: 'up' },
  { key: 'NEGATIVE', label: 'Negative', variant: 'down' },
  { key: 'NEUTRAL', label: 'Neutral', variant: 'neutral' },
];

const News = () => {
  const { marketNews, setMarketNews, isLoading, setLoading } = useStore();
  const [error, setError] = useState('');

  useEffect(() => {
    if (marketNews.length === 0) {
      fetchNews();
    }
  }, []);

  const fetchNews = async () => {
    setLoading('news', true);
    setError('');
    try {
      const res = await api.get('/news/market?limit=20');
      if (res.data?.articles) {
        setMarketNews(res.data.articles);
      }
    } catch (e) {
      console.error(e);
      // The page previously swallowed this entirely: a failed fetch left the
      // heading above a blank page with no indication anything had gone wrong.
      setError('Could not load market news. Please try again.');
    } finally {
      setLoading('news', false);
    }
  };

  // The news API is inconsistent about sentiment casing: the same endpoint
  // returns "POSITIVE" on some responses and "Positive" on others. Compare
  // case-insensitively, and treat anything that is not explicitly positive or
  // negative as neutral so no article can silently vanish.
  const sentimentOf = (n) => (n.sentiment || '').toUpperCase();
  const bucketOf = (n) => {
    const s = sentimentOf(n);
    return s === 'POSITIVE' || s === 'NEGATIVE' ? s : 'NEUTRAL';
  };

  const grouped = SECTIONS.map(section => ({
    ...section,
    articles: marketNews.filter(n => bucketOf(n) === section.key),
  }));

  const loading = isLoading.news;

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5">
      <PageHeader
        title="Market News"
        subtitle="Headlines across the Indian market, grouped by sentiment."
        icon={Newspaper}
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={fetchNews} loading={loading}>
            Refresh
          </Button>
        }
      />

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-down/30 bg-down/10 px-4 py-3">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-down" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm text-down">{error}</p>
            <Button variant="ghost" size="sm" onClick={fetchNews} className="mt-1 -ml-2">Try again</Button>
          </div>
        </div>
      )}

      {/* The page had no loading state at all — it rendered its heading over
          blank space until the request came back. */}
      {loading && marketNews.length === 0 ? (
        <div className="space-y-3">
          <SkeletonBox className="h-5 w-32" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <SkeletonBox key={i} className="h-36 rounded-xl" />)}
          </div>
        </div>
      ) : marketNews.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="No headlines right now"
          description="Nothing has come through the feed yet. Try refreshing in a moment."
          action={<Button size="sm" variant="primary" icon={RefreshCw} onClick={fetchNews}>Refresh</Button>}
        />
      ) : (
        <div className="space-y-7">
          {grouped.map(({ key, label, variant, articles }) => articles.length === 0 ? null : (
            <section key={key} aria-labelledby={`news-${key}`}>
              <div className="flex items-center gap-2 mb-3">
                <h2
                  id={`news-${key}`}
                  className="text-2xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  {label}
                </h2>
                <Badge variant={variant}>{articles.length}</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {articles.map((news, i) => (
                  <a
                    key={`${key}-${i}`}
                    href={news.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'group flex flex-col rounded-xl p-4',
                      'bg-surface-900 border border-surface-800',
                      'transition-colors duration-fast hover:border-surface-700',
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2.5">
                      {/* Source initial rather than a favicon: no extra network
                          request, and no broken-image state when a feed has no
                          icon. */}
                      <span
                        aria-hidden="true"
                        className="flex items-center justify-center w-5 h-5 shrink-0 rounded
                                   bg-surface-800 text-2xs font-semibold text-gray-400"
                      >
                        {(news.source || '?').charAt(0).toUpperCase()}
                      </span>
                      <span className="text-2xs text-gray-500 truncate">{news.source}</span>
                      <span className="text-2xs text-gray-600 ml-auto shrink-0">
                        {timeAgo(news.published_date, { fallback: news.published_display || 'Recent' })}
                      </span>
                    </div>

                    {/* Was a fixed h-48, so a short headline left a large gap and
                        a long one clipped mid-word. The card now sizes to its
                        content with a consistent 3-line clamp. */}
                    <h3 className="text-sm text-gray-200 leading-snug line-clamp-3 transition-colors duration-fast group-hover:text-gray-50">
                      {decodeEntities(news.title)}
                    </h3>

                    <div className="flex items-center justify-between gap-2 mt-auto pt-3">
                      <Badge variant={variant}>{label}</Badge>
                      <ExternalLink
                        size={12}
                        aria-hidden="true"
                        className="text-gray-600 transition-colors duration-fast group-hover:text-brand-400"
                      />
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default News;
