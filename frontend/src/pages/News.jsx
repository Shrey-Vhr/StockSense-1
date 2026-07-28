import { useEffect } from 'react';
import { Newspaper } from 'lucide-react';
import api from '../utils/api';
import useStore from '../store/useStore';

const News = () => {
  const { marketNews, setMarketNews, isLoading, setLoading } = useStore();

  useEffect(() => {
    if (marketNews.length === 0) {
      fetchNews();
    }
  }, []);

  const fetchNews = async () => {
    setLoading('news', true);
    try {
      const res = await api.get('/news/market?limit=20');
      if (res.data?.articles) {
        setMarketNews(res.data.articles);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading('news', false);
    }
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Recent';
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short', 
        year: 'numeric'
      });
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-surface-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <Newspaper className="text-[#10b981] mr-3" size={28} /> Market News
        </h1>
      </div>

      {(() => {
        // The news API is inconsistent about sentiment casing: the same endpoint
        // returns "POSITIVE" on some responses and "Positive" on others. The old
        // case-sensitive match therefore dropped every article from all three
        // buckets on the upper-case responses, rendering a blank page. Compare
        // case-insensitively, and treat anything that is not explicitly positive
        // or negative as neutral so no article can silently vanish again.
        const sentimentOf = (n) => (n.sentiment || '').toUpperCase();
        const positiveNews = marketNews.filter(n => sentimentOf(n) === 'POSITIVE');
        const negativeNews = marketNews.filter(n => sentimentOf(n) === 'NEGATIVE');
        const neutralNews = marketNews.filter(n => !['POSITIVE', 'NEGATIVE'].includes(sentimentOf(n)));

        const renderNewsCards = (newsList) => (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {newsList.map((news, i) => (
              <a 
                href={news.url} 
                target="_blank" 
                rel="noopener noreferrer"
                key={i} 
                className="bg-surface-850 border border-surface-800 rounded-xl p-5 hover:border-[#10b981] transition-all flex flex-col justify-between h-48 group"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs text-[#10b981] font-medium">{news.source}</div>
                    {news.sentiment && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        sentimentOf(news) === 'POSITIVE' ? 'bg-green-900/50 text-green-400'
                        : sentimentOf(news) === 'NEGATIVE' ? 'bg-red-900/50 text-red-400'
                        : 'bg-gray-700 text-gray-400'
                      }`}>
                        {sentimentOf(news) === 'POSITIVE' ? '↑' : sentimentOf(news) === 'NEGATIVE' ? '↓' : '—'} {news.sentiment}
                      </span>
                    )}
                  </div>
                  <h3 className="text-gray-200 font-medium line-clamp-3 leading-snug group-hover:text-white transition-colors">
                    {news.title}
                  </h3>
                </div>
                <div className="text-xs text-gray-500 mt-4 border-t border-surface-800 pt-3">
                  {news.published_display || formatDate(news.published_date)}
                </div>
              </a>
            ))}
          </div>
        );

        return (
          <div className="space-y-8">
            {positiveNews.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-[#00c853] mb-4 flex items-center">
                  Positive News
                </h2>
                {renderNewsCards(positiveNews)}
              </div>
            )}
            
            {negativeNews.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-[#ff1744] mb-4 flex items-center">
                  Negative News
                </h2>
                {renderNewsCards(negativeNews)}
              </div>
            )}

            {neutralNews.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-400 mb-4 flex items-center">
                  Neutral News
                </h2>
                {renderNewsCards(neutralNews)}
              </div>
            )}
          </div>
        );
      })()}
      
      {marketNews.length === 0 && !isLoading.news && (
         <div className="text-center py-20 text-gray-500">
           No news articles found.
         </div>
      )}
    </div>
  );
};

export default News;
