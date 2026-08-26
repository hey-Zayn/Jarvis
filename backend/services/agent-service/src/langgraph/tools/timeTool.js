/**
 * Tool definition for getting current date and time
 */
export const timeTool = {
  name: 'get_current_time',
  description: 'Get the current date, time, and timezone information.',
  parameters: {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        description: 'Optional IANA timezone name (e.g., "America/New_York", "UTC", "Asia/Karachi"). Defaults to system local timezone.'
      }
    }
  },
  async handler({ timezone } = {}) {
    const now = new Date();
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    };

    if (timezone) {
      try {
        options.timeZone = timezone;
      } catch (err) {
        // Fallback if invalid timezone passed
      }
    }

    return {
      iso: now.toISOString(),
      formatted: new Intl.DateTimeFormat('en-US', options).format(now),
      timestamp: now.getTime(),
      timezone: options.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }
};
