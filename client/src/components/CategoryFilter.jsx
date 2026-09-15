import React from 'react';
import { Flame, Cpu, Briefcase, Atom, Layers, Bookmark } from 'lucide-react';

const CATEGORY_ICONS = {
  'Все': Layers,
  'Главное': Flame,
  'Технологии': Cpu,
  'Бизнес': Briefcase,
  'Наука': Atom,
  'Избранное': Bookmark
};

export default function CategoryFilter({
  categories = [],
  selectedCategory,
  onSelectCategory,
  totalCount = 0,
  showBookmarksOnly,
  setShowBookmarksOnly,
  bookmarkCount = 0
}) {
  const baseCategories = ['Все', 'Главное', 'Технологии', 'Бизнес', 'Наука'];

  // Map existing counts from backend
  const countMap = {};
  categories.forEach(c => {
    countMap[c.category] = c.count;
  });

  return (
    <div className="py-4 border-b border-slate-200/60 dark:border-slate-800/60 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2 min-w-max">
        {baseCategories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat] || Layers;
          const isSelected = !showBookmarksOnly && (selectedCategory === cat || (cat === 'Все' && !selectedCategory));
          const count = cat === 'Все' ? totalCount : (countMap[cat] || 0);

          return (
            <button
              key={cat}
              onClick={() => {
                setShowBookmarksOnly(false);
                onSelectCategory(cat === 'Все' ? '' : cat);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                isSelected
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{cat}</span>
              {count > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isSelected
                      ? 'bg-sky-400/40 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {/* Bookmarks Filter Pill */}
        <button
          onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
            showBookmarksOnly
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Избранное</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              showBookmarksOnly
                ? 'bg-amber-400/40 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            {bookmarkCount}
          </span>
        </button>
      </div>
    </div>
  );
}
