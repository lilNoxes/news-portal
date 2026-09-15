export function formatRelativeTime(dateStringOrTimestamp) {
  if (!dateStringOrTimestamp) return '';
  
  const date = new Date(dateStringOrTimestamp);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) {
    return 'Только что';
  }
  if (diffMin < 60) {
    return `${diffMin} ${pluralize(diffMin, 'минуту', 'минуты', 'минут')} назад`;
  }
  if (diffHours < 24) {
    return `${diffHours} ${pluralize(diffHours, 'час', 'часа', 'часов')} назад`;
  }
  if (diffDays === 1) {
    const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return `Вчера в ${time}`;
  }
  if (diffDays < 7) {
    return `${diffDays} ${pluralize(diffDays, 'день', 'дня', 'дней')} назад`;
  }

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function pluralize(n, one, two, five) {
  let num = Math.abs(n) % 100;
  let rem = num % 10;
  if (num > 10 && num < 20) return five;
  if (rem > 1 && rem < 5) return two;
  if (rem === 1) return one;
  return five;
}
