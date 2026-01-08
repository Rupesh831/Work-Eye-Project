/**
 * Format a date/time string to show relative time (e.g., "1 minute ago", "3 hours ago", "2 days ago")
 * or absolute time if older than 2 days
 */
export function formatLastActivity(lastActivityStr: string): string {
  if (!lastActivityStr || lastActivityStr === 'Unknown' || lastActivityStr === 'Never') {
    return 'Never';
  }

  try {
    // Try to parse the date
    let lastActivityDate: Date;
    
    // Check if it's already an ISO string
    if (lastActivityStr.includes('T') || lastActivityStr.includes('Z')) {
      lastActivityDate = new Date(lastActivityStr);
    } else {
      // Try parsing as is
      lastActivityDate = new Date(lastActivityStr);
    }

    // Check if date is valid
    if (isNaN(lastActivityDate.getTime())) {
      return lastActivityStr; // Return original if can't parse
    }

    const now = new Date();
    const diffMs = now.getTime() - lastActivityDate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    // Less than 1 minute - show seconds
    if (diffSeconds < 60) {
      if (diffSeconds <= 5) {
        return 'Just now';
      }
      return `${diffSeconds} second${diffSeconds !== 1 ? 's' : ''} ago`;
    }

    // Less than 1 hour - show exact minutes
    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    }

    // Less than 24 hours - show exact hours
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }

    // 1 to 2 days - show days
    if (diffDays <= 2) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }

    // More than 2 days - show exact date and time
    return lastActivityDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: lastActivityDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

  } catch (error) {
    console.error('Error formatting last activity:', error);
    return lastActivityStr; // Return original on error
  }
}
