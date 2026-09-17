import React, { useEffect, useRef } from 'react';
import { Newspaper, Search, Moon, Sun, X, Bookmark, ShieldCheck, Lock, Command, Sparkles } from 'lucide-react';

export default function Header({
  searchQuery,
  setSearchQuery,
  isDarkMode,
  setIsDarkMode,
  isAdmin,
  onOpenAdminLogin,
  onOpenAdminPanel,
  bookmarkCount,
  showBookmarksOnly,
  setShowBookmarksOnly,
  onOpenDigest
}) {
  const searchInputRef = useRef(null);

  const currentDate = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  // Keyboard shortcut: Ctrl+K or Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/75 dark:bg-slate-950/75 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800/70 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Live Status */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25">
              <Newspaper className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg sm:text-xl tracking-tight bg-gradient-to-r from-slate-900 via-sky-900 to-indigo-950 dark:from-white dark:via-sky-200 dark:to-indigo-200 bg-clip-text text-transparent">
                  ИнфоЛента
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500" />
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize hidden sm:block">
                {currentDate}
              </p>
            </div>
          </div>

          {/* Search Bar with Ctrl+K shortcut */}
          <div className="flex-1 max-w-md relative hidden md:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по новостям и событиям..."
              className="w-full pl-9 pr-16 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/80 focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition shadow-inner"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800/60 text-[10px] font-medium text-slate-400 pointer-events-none border border-slate-300/40 dark:border-slate-700/40">
                <Command className="w-2.5 h-2.5" />
                <span>K</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            
            {/* Gemini AI Daily Digest Button */}
            <button
              onClick={onOpenDigest}
              title="Сформировать AI-дайджест дня (Gemini)"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-600 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span className="hidden sm:inline">AI Дайджест</span>
            </button>

            {/* Bookmarks Toggle */}
            <button
              onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
              title="Сохраненные закладки"
              className={`relative p-2 rounded-xl border transition-all duration-150 ${
                showBookmarksOnly
                  ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/25'
                  : 'border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${showBookmarksOnly ? 'fill-current' : ''}`} />
              {bookmarkCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white ring-2 ring-white dark:ring-slate-900 shadow-sm">
                  {bookmarkCount}
                </span>
              )}
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? 'Светлая тема' : 'Темная тема'}
              className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Admin Action Button */}
            {isAdmin ? (
              <button
                onClick={onOpenAdminPanel}
                title="Открыть панель администратора"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition active:scale-95"
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Админ-панель</span>
              </button>
            ) : (
              <button
                onClick={onOpenAdminLogin}
                title="Вход для администратора"
                className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-sky-500 hover:border-sky-300 dark:hover:border-sky-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}

          </div>

        </div>

        {/* Mobile Search Bar */}
        <div className="pb-3 md:hidden">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по новостям..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}
