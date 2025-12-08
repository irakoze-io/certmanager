/**
 * Format date to "dd MMM yy" format
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string (e.g., "15 Jan 25")
 */
export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return '-';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) return '-';
  
  const day = date.getDate().toString().padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  
  return `${day} ${month} ${year}`;
}

/**
 * Format time to "HH:mm" format
 * @param dateString - ISO date string or Date object
 * @returns Formatted time string (e.g., "14:30")
 */
export function formatTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) return '';
  
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
}
