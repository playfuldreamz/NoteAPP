/**
 * Formats a UTC date string (YYYY-MM-DD) into a short localized date string (e.g., "Apr 27").
 *
 * @param dateInput - The date string, expected to be 'YYYY-MM-DD' or contain it (e.g., 'YYYY-MM-DD HH:MM:SS' or 'YYYY-MM-DDTHH:MM:SSZ').
 * @returns The short localized date string (e.g., "Apr 27"), or the original string if parsing fails.
 */
export const formatUTCDateToShortLocal = (dateInput: string): string => {
  try {
    let datePart = dateInput;

    // Extract YYYY-MM-DD part
    if (dateInput.includes(' ')) {
      datePart = dateInput.split(' ')[0];
    } else if (dateInput.includes('T')) {
      datePart = dateInput.split('T')[0];
    }

    // Ensure the extracted date part is treated as UTC
    const date = new Date(`${datePart}T00:00:00Z`);

    if (isNaN(date.getTime())) {
      console.warn('Invalid date string encountered in formatUTCDateToShortLocal:', dateInput);
      return dateInput;
    }

    // Format using the user's locale and timezone for short date
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (error) {
    console.error('Error formatting short UTC date string:', dateInput, error);
    return dateInput;
  }
};

/**
 * Formats a UTC timestamp string into a long localized date and time string (e.g., "Apr 27, 2025, 7:50 PM").
 *
 * @param timestampInput - The timestamp string (e.g., '2025-04-28 01:50:10', '2025-04-28T01:50:10Z').
 * @returns The long localized date and time string, or the original string if parsing fails.
 */
export const formatUTCTimestampToLongLocal = (timestampInput: string): string => {
  try {
    // Attempt to parse the timestamp. 
    // JavaScript's Date constructor can often handle various formats, including ISO 8601 with 'Z' or space separators.
    // If the input doesn't specify a timezone, Date() might interpret it as local time. 
    // To ensure UTC interpretation if no timezone is specified, we can append 'Z' if it's missing and looks like a standard format.
    let adjustedTimestamp = timestampInput;
    if (timestampInput.includes(' ') && !timestampInput.endsWith('Z')) {
      // Replace space with 'T' and append 'Z' for UTC interpretation
      adjustedTimestamp = timestampInput.replace(' ', 'T') + 'Z';
    } else if (!timestampInput.endsWith('Z') && timestampInput.includes('T')) {
      // If it has T but no Z, assume UTC
      adjustedTimestamp = timestampInput + 'Z';
    }
    
    const date = new Date(adjustedTimestamp);

    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp string encountered in formatUTCTimestampToLongLocal:', timestampInput);
      // Fallback: Try parsing just the date part if full timestamp failed
      const dateOnly = new Date(`${timestampInput.split(/[ T]/)[0]}T00:00:00Z`);
      if (!isNaN(dateOnly.getTime())) {
        return dateOnly.toLocaleDateString(undefined, {
          year: 'numeric', month: 'short', day: 'numeric'
        });
      }
      return timestampInput; // Return original if all parsing fails
    }

    // Format using the user's locale and timezone for long date and time
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      // timeZoneName: 'short' // Optional: include timezone abbreviation
    });
  } catch (error) {
    console.error('Error formatting long UTC timestamp string:', timestampInput, error);
    return timestampInput;
  }
};
