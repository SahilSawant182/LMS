export const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '';
  
  const cleanStr = String(dateString).trim();
  // Extract date part if time is attached (e.g. "2026-10-13 15:20:22.339524" or ISO string)
  const datePart = cleanStr.includes('T') ? cleanStr.split('T')[0] : cleanStr.split(' ')[0];
  const parts = datePart.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
  }
  
  // Fallback for full ISO strings if any
  const date = new Date(cleanStr);
  if (isNaN(date.getTime())) return dateString;
  
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
};

export const timeAgo = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    const cleanStr = String(dateStr).trim();
    const formattedStr = cleanStr.includes('T') ? cleanStr : cleanStr.replace(' ', 'T');
    const date = new Date(formattedStr);
    if (isNaN(date.getTime())) return dateStr;

    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 45) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr || '';
  }
};

export const getInitials = (name?: string | null): string => {
  if (!name) return 'U';
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};
