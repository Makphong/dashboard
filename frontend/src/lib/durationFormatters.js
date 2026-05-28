export function formatDuration(seconds) {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  const MINUTE = 60;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const MONTH = 24 * DAY;
  const YEAR = 12 * MONTH;

  if (safe > YEAR) {
    const years = Math.floor(safe / YEAR);
    const months = Math.floor((safe % YEAR) / MONTH);
    return `${years}y ${months}mo`;
  }

  if (safe > MONTH) {
    const months = Math.floor(safe / MONTH);
    const days = Math.floor((safe % MONTH) / DAY);
    return `${months}mo ${days}d`;
  }

  if (safe > DAY) {
    const days = Math.floor(safe / DAY);
    const hours = Math.floor((safe % DAY) / HOUR);
    return `${days}d ${hours}h`;
  }

  const h = Math.floor(safe / HOUR);
  const m = Math.floor((safe % HOUR) / MINUTE);
  const s = safe % MINUTE;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatPercent(value) {
  return `${((Number(value) || 0) * 100).toFixed(1)}%`;
}
