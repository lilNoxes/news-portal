import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import CategoryFilter from './components/CategoryFilter';
import NewsCard from './components/NewsCard';
import FeaturedNews from './components/FeaturedNews';
import NewsModal from './components/NewsModal';
import DigestModal from './components/DigestModal';
import AdminLoginModal from './components/AdminLoginModal';
import AdminPanelModal from './components/AdminPanelModal';
import StatsBanner from './components/StatsBanner';
import { Newspaper, Loader2, Sparkles, Bookmark, ArrowUp, Lock, ShieldCheck } from 'lucide-react';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('news_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Admin Auth state
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('news_admin_token') || '');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  // News states
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [stats, setStats] = useState(null);

  // Bookmarks (saved in localStorage)
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem('news_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  // Modals
  const [activeModalArticle, setActiveModalArticle] = useState(null);
  const [digestOpen, setDigestOpen] = useState(false);

  // Scroll to top button state
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('news_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('news_theme', 'light');
    }
  }, [isDarkMode]);

  // Verify admin token on startup
  useEffect(() => {
    if (adminToken) {
      fetch('/api/admin/verify', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.success && data.isAdmin) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
            setAdminToken('');
            localStorage.removeItem('news_admin_token');
          }
        })
        .catch(() => {
          setIsAdmin(false);
        });
    }
  }, [adminToken]);

  const handleAdminLoginSuccess = (token) => {
    setAdminToken(token);
    setIsAdmin(true);
    localStorage.setItem('news_admin_token', token);
    setAdminPanelOpen(true);
  };

  const handleAdminLogout = () => {
    setAdminToken('');
    setIsAdmin(false);
    localStorage.removeItem('news_admin_token');
  };

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch articles from API
  const fetchNews = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (!append) setLoading(true);

      const params = new URLSearchParams({
        page: pageNum,
        limit: 24
      });

      if (selectedCategory) params.append('category', selectedCategory);
      if (debouncedSearch) params.append('q', debouncedSearch);

      const res = await fetch(`/api/news?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        if (append) {
          setArticles(prev => [...prev, ...data.articles]);
        } else {
          setArticles(data.articles);
        }
        setCategories(data.categories || []);
        setPage(data.pagination.page);
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.total);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to load news:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, debouncedSearch]);

  // Fetch stats
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  // Initial load & category/search change
  useEffect(() => {
    fetchNews(1, false);
    fetchStats();
  }, [fetchNews]);

  // Background auto-refresh stats every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
    }, 120000);
    return () => clearInterval(interval);
  }, []);

  // Toggle bookmark
  const toggleBookmark = (article) => {
    setBookmarks(prev => {
      const exists = prev.some(b => b.link === article.link);
      let updated;
      if (exists) {
        updated = prev.filter(b => b.link !== article.link);
      } else {
        updated = [article, ...prev];
      }
      localStorage.setItem('news_bookmarks', JSON.stringify(updated));
      return updated;
    });
  };

  // Load more articles
  const handleLoadMore = () => {
    if (page < totalPages) {
      fetchNews(page + 1, true);
    }
  };

  // Scroll listener
  useEffect(() => {
    const checkScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', checkScroll);
    return () => window.removeEventListener('scroll', checkScroll);
  }, []);

  // Determine displayed articles
  let displayedArticles = showBookmarksOnly ? bookmarks : articles;
  if (showBookmarksOnly && debouncedSearch) {
    displayedArticles = displayedArticles.filter(a =>
      a.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (a.description && a.description.toLowerCase().includes(debouncedSearch.toLowerCase()))
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors overflow-x-hidden w-full max-w-full">
      
      {/* Header */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        isAdmin={isAdmin}
        onOpenAdminLogin={() => setAdminLoginOpen(true)}
        onOpenAdminPanel={() => setAdminPanelOpen(true)}
        bookmarkCount={bookmarks.length}
        showBookmarksOnly={showBookmarksOnly}
        setShowBookmarksOnly={setShowBookmarksOnly}
        onOpenDigest={() => setDigestOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full max-w-full py-6 overflow-x-hidden">
        
        {/* Category Filter */}
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            setPage(1);
          }}
          totalCount={totalCount}
          showBookmarksOnly={showBookmarksOnly}
          setShowBookmarksOnly={setShowBookmarksOnly}
          bookmarkCount={bookmarks.length}
        />

        {/* Stats banner */}
        {!showBookmarksOnly && <StatsBanner stats={stats} lastUpdated={lastUpdated} />}

        {/* Section Title */}
        <div className="flex items-center justify-between mt-6 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              {showBookmarksOnly ? (
                <>
                  <Bookmark className="w-6 h-6 text-amber-500 fill-current" />
                  <span>Сохраненные закладки</span>
                </>
              ) : selectedCategory ? (
                <>
                  <span>{selectedCategory}</span>
                  <span className="text-sm font-normal text-slate-400">({totalCount})</span>
                </>
              ) : debouncedSearch ? (
                <>
                  <span>Результаты поиска: "{debouncedSearch}"</span>
                  <span className="text-sm font-normal text-slate-400">({totalCount})</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-sky-500" />
                  <span>Главная лента новостей</span>
                </>
              )}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {showBookmarksOnly
                ? `У вас сохранено статей: ${bookmarks.length}`
                : 'Свежие материалы из проверенных изданий'}
            </p>
          </div>

          {/* Admin badge indicator if logged in */}
          {isAdmin && (
            <div
              onClick={() => setAdminPanelOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40 text-xs font-semibold cursor-pointer hover:bg-emerald-100 transition"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Режим администратора</span>
            </div>
          )}
        </div>

        {/* News Grid or Empty State */}
        {loading && articles.length === 0 ? (
          /* Loading Skeletons */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 my-8">
            {[...Array(6)].map((_, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-pulse"
              >
                <div className="aspect-[16/9] bg-slate-200 dark:bg-slate-800" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
                  <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-5/6" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : displayedArticles.length > 0 ? (
          /* Articles Content */
          <>
            {/* Spotlight Hero Story for the #1 freshest article */}
            {!showBookmarksOnly && !debouncedSearch && page === 1 && displayedArticles[0] && (
              <FeaturedNews
                article={displayedArticles[0]}
                isBookmarked={bookmarks.some(b => b.link === displayedArticles[0].link)}
                onToggleBookmark={toggleBookmark}
                onOpenModal={setActiveModalArticle}
              />
            )}

            {/* Articles Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 my-6">
              {(!showBookmarksOnly && !debouncedSearch && page === 1
                ? displayedArticles.slice(1)
                : displayedArticles
              ).map((article) => (
                <NewsCard
                  key={article.id || article.link}
                  article={article}
                  isBookmarked={bookmarks.some(b => b.link === article.link)}
                  onToggleBookmark={toggleBookmark}
                  onOpenModal={setActiveModalArticle}
                />
              ))}
            </div>

            {/* Pagination / Load More */}
            {!showBookmarksOnly && page < totalPages && (
              <div className="text-center my-10">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-8 py-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-sm font-semibold shadow-sm transition active:scale-95 inline-flex items-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin text-sky-500" />}
                  <span>Загрузить еще новости (страница {page} из {totalPages})</span>
                </button>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="my-16 text-center max-w-md mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-500 flex items-center justify-center mx-auto mb-4">
              <Newspaper className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              {showBookmarksOnly ? 'В закладках пока пусто' : 'Новости не найдены'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {showBookmarksOnly
                ? 'Нажмите на иконку закладки на любой новости, чтобы сохранить ее для быстрого доступа.'
                : debouncedSearch
                ? `По запросу "${debouncedSearch}" ничего не нашлось. Попробуйте изменить формулировку.`
                : 'Пока нет новостей в выбранной категории.'}
            </p>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-sky-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-200">ИнфоЛента</span>
            <span>— актуальные события в режиме реального времени</span>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin ? (
              <button
                onClick={() => setAdminPanelOpen(true)}
                className="hover:text-emerald-500 font-medium transition flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Панель управления</span>
              </button>
            ) : (
              <button
                onClick={() => setAdminLoginOpen(true)}
                className="hover:text-sky-500 transition flex items-center gap-1"
              >
                <Lock className="w-3 h-3" />
                <span>Вход для редактора</span>
              </button>
            )}
            <span>•</span>
            <span>Авто-обновление каждые 10 мин</span>
          </div>
        </div>
      </footer>

      {/* Scroll to top floating button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 p-3 rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-500/30 hover:bg-sky-600 transition active:scale-95 z-40"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Modals */}
      <NewsModal
        article={activeModalArticle}
        onClose={() => setActiveModalArticle(null)}
        isBookmarked={activeModalArticle ? bookmarks.some(b => b.link === activeModalArticle.link) : false}
        onToggleBookmark={toggleBookmark}
      />

      <DigestModal
        isOpen={digestOpen}
        onClose={() => setDigestOpen(false)}
      />

      <AdminLoginModal
        isOpen={adminLoginOpen}
        onClose={() => setAdminLoginOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      <AdminPanelModal
        isOpen={adminPanelOpen}
        onClose={() => setAdminPanelOpen(false)}
        adminToken={adminToken}
        onLogout={handleAdminLogout}
        onRefreshData={() => {
          fetchNews(1, false);
          fetchStats();
        }}
      />

    </div>
  );
}
