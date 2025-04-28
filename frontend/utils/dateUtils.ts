/**
 * Formats a UTC date string (YYYY-MM-DD) into a localized date string (e.g., "Apr 27").
 *
 * @param utcDateString - The date string in 'YYYY-MM-DD' format, representing a UTC date.
 * @returns The localized date string, or the original string if parsing fails.
 */
export const formatUTCDateStringToLocal = (utcDateString: string): string => {
  try {
    // Ensure the input is treated as UTC by appending time and 'Z'
    const date = new Date(`${utcDateString}T00:00:00Z`);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string encountered in formatUTCDateStringToLocal:', utcDateString);
      return utcDateString; // Return original if invalid
    }

    // Format using the user's locale and timezone
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (error) {
    console.error('Error formatting UTC date string:', utcDateString, error);
    return utcDateString; // Return original on error
  }
};
