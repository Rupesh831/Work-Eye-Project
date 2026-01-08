/**
 * Timezone Utilities - Converts UTC timestamps to local time
 * Works with any timezone automatically based on user's browser settings
 */

/**
 * Convert UTC timestamp to local time string
 * Handles multiple input formats from backend
 */
export function formatLocalTime(timestamp: string | null | undefined): string {
  if (!timestamp || timestamp === 'Unknown' || timestamp === 'Never' || timestamp === 'Recent') {
    return timestamp || 'Unknown';
  }

  try {
    let date: Date;

    // Try parsing as ISO format first (2025-12-22T06:36:15Z)
    if (timestamp.includes('T') || timestamp.includes('Z')) {
      date = new Date(timestamp);
    }
    // Try parsing YYYY-MM-DD HH:MM:SS format (2025-12-22 06:36:15)
    else if (timestamp.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
      // Backend sends UTC time, parse it as UTC
      const parts = timestamp.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
      if (parts) {
        date = new Date(Date.UTC(
          parseInt(parts[1]), // year
          parseInt(parts[2]) - 1, // month (0-indexed)
          parseInt(parts[3]), // day
          parseInt(parts[4]), // hour
          parseInt(parts[5]), // minute
          parseInt(parts[6])  // second
        ));
      } else {
        return timestamp;
      }
    }
    // Try parsing HH:MM AM/PM format (07:01 AM)
    else if (timestamp.match(/^\d{1,2}:\d{2}\s?(AM|PM)$/i)) {
      // This is already formatted time, assume it's UTC and needs conversion
      const now = new Date();
      const timeMatch = timestamp.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const period = timeMatch[3].toUpperCase();
        
        // Convert to 24-hour format
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        // Create UTC date
        date = new Date(Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          hours,
          minutes,
          0
        ));
      } else {
        return timestamp;
      }
    }
    // Default: try direct parsing
    else {
      date = new Date(timestamp);
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return timestamp;
    }

    // Return time in local timezone (HH:MM AM/PM)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting time:', error, 'Input:', timestamp);
    return timestamp;
  }
}

/**
 * Convert UTC timestamp to local datetime string
 * Format: YYYY-MM-DD HH:MM:SS in local timezone
 */
export function formatLocalDateTime(timestamp: string | null | undefined): string {
  if (!timestamp || timestamp === 'Unknown' || timestamp === 'Never') {
    return timestamp || 'Unknown';
  }

  try {
    let date: Date;

    // Try parsing as ISO format
    if (timestamp.includes('T') || timestamp.includes('Z')) {
      date = new Date(timestamp);
    }
    // Parse YYYY-MM-DD HH:MM:SS format as UTC
    else if (timestamp.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
      const parts = timestamp.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
      if (parts) {
        date = new Date(Date.UTC(
          parseInt(parts[1]),
          parseInt(parts[2]) - 1,
          parseInt(parts[3]),
          parseInt(parts[4]),
          parseInt(parts[5]),
          parseInt(parts[6])
        ));
      } else {
        return timestamp;
      }
    }
    else {
      date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) {
      return timestamp;
    }

    // Format as YYYY-MM-DD HH:MM:SS in local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error('Error formatting datetime:', error, 'Input:', timestamp);
    return timestamp;
  }
}

/**
 * Format for screenshot timestamps
 * Handles backend format: "2025-12-22 06:36:15" (UTC)
 * Returns: "2025-12-22 12:06:15" (Local)
 */
export function formatScreenshotTime(timestamp: string | null | undefined): string {
  return formatLocalDateTime(timestamp);
}

/**
 * Format for activity log timestamps
 * Handles backend format: "07:01 AM" (UTC)
 * Returns: "12:31 PM" (Local)
 */
export function formatActivityTime(timestamp: string | null | undefined): string {
  return formatLocalTime(timestamp);
}
