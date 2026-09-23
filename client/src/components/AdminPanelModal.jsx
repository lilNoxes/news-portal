import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, RefreshCw, Rss, ShieldCheck, LogOut, AlertCircle, CheckCircle2, Zap } from 'lucide-react';

export default function AdminPanelModal({
  isOpen,
  onClose,
  adminToken,
  onLogout,
  onRefreshData
}) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('Главное');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshingNews, setRefreshingNews] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSources();
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  const loadSources = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sources');
      const data = await res.json();
      if (data.success) {
        setSources(data.sources);
      }
    } catch (err) {
      console.error('Failed to load sources:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await fetch(`/api/sources/${id}/toggle`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setSources(prev => prev.map(s => s.id === id ? { ...s, enabled: data.enabled } : s));
        onRefreshData?.();
      } else {
        setError(data.error || 'Ошибка изменения статуса источника');
      }
    } catch (err) {
      setError('Ошибка сети: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Вы уверены, что хотите удалить этот источник?')) return;
    try {
      const res = await fetch(`/api/sources/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setSources(prev => prev.filter(s => s.id !== id));
        onRefreshData?.();
      } else {
        setError(data.error || 'Ошибка при удалении');
      }
    } catch (err) {
      setError('Ошибка сети: ' + err.message);
    }
  };

  const handleAddSource = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!name.trim() || !url.trim()) {
      setError('Заполните название и URL RSS-ленты');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ name, url, category })
      });
      const data = await res.json();
      if (data.success) {
        setName('');
        setUrl('');
        setSuccessMsg('Источник успешно добавлен!');
        loadSources();
        onRefreshData?.();
      } else {
        setError(data.error || 'Ошибка при добавлении источника');
      }
    } catch (err) {
      setError('Ошибка сети: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualRefresh = async () => {
    try {
      setRefreshingNews(true);
      setError('');
      setSuccessMsg('');
      const res = await fetch('/api/news/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Лента успешно обновлена! Добавлено новых статей: ${data.totalAdded ?? 0}`);
        loadSources();
        onRefreshData?.();
      } else {
        setError(data.error || 'Не удалось обновить новости');
      }
    } catch (err) {
      setError('Ошибка обновления: ' + err.message);
    } finally {
      setRefreshingNews(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Панель администратора
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Полный контроль над источниками и обновлением ленты
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              title="Выйти из админ-панели"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Выйти</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          
          {/* Alerts */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Action: Force Refresh News */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 to-indigo-500/10 border border-sky-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-sky-500" />
                Принудительный сбор свежих новостей
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Опросить все активные RSS-источники прямо сейчас
              </p>
            </div>

            <button
              onClick={handleManualRefresh}
              disabled={refreshingNews}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 whitespace-nowrap active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingNews ? 'animate-spin' : ''}`} />
              <span>{refreshingNews ? 'Обновляем ленту...' : 'Обновить сейчас'}</span>
            </button>
          </div>

          {/* Add New Source Form */}
          <form onSubmit={handleAddSource} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-sky-500" />
              Добавить новый RSS-канал
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Название (напр. ТАСС)"
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
              />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="URL RSS (https://.../rss.xml)"
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
              >
                <option value="Главное">Главное</option>
                <option value="В мире">В мире</option>
                <option value="Технологии">Технологии</option>
                <option value="Бизнес">Бизнес</option>
                <option value="Наука">Наука</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
            >
              {submitting ? 'Добавление...' : 'Добавить источник'}
            </button>
          </form>

          {/* Sources List */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Управление источниками ({sources.filter(s => s.enabled).length} активно из {sources.length})
            </h3>

            {loading ? (
              <div className="p-8 text-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                Загрузка источников...
              </div>
            ) : (
              sources.map((src) => (
                <div
                  key={src.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {src.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {src.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 truncate">
                      <span className="truncate">{src.url}</span>
                      <span>•</span>
                      <span className="shrink-0">{src.article_count || 0} новостей</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Toggle Switch */}
                    <button
                      onClick={() => handleToggle(src.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        src.enabled ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          src.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(src.id)}
                      title="Удалить источник"
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
