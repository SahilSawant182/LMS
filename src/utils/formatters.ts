export const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '';
  
  // Assuming dateString is "YYYY-MM-DD"
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  }
  
  // Fallback for full ISO strings if any
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
};
