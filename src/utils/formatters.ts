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
