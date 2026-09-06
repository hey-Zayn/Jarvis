/**
 * Jarvis Location & Nearby Search Tools
 * Allows Jarvis to access user location and perform contextual nearby searches (hospitals, services, food, etc.)
 */

export const locationTool = {
  name: 'get_user_location',
  description: 'Retrieve the user\'s current or last known physical location (latitude, longitude, and city/label) to ground location-based queries.',
  parameters: {
    type: 'object',
    properties: {}
  },
  async handler(_args, context = {}) {
    const loc = context.userLocation;
    if (!loc || (loc.latitude === undefined && loc.longitude === undefined)) {
      return {
        hasLocation: false,
        message: 'User location is not currently shared or saved. Ask user to enable location access in the Jarvis app.'
      };
    }

    return {
      hasLocation: true,
      latitude: loc.latitude,
      longitude: loc.longitude,
      label: loc.label || `${loc.latitude}, ${loc.longitude}`,
      updatedAt: loc.updatedAt || new Date().toISOString()
    };
  }
};

export const searchNearbyTool = {
  name: 'search_nearby',
  description: 'Search for places, businesses, hospitals, pharmacies, restaurants, or services near the user\'s current location.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The place or service to find nearby (e.g. "hospital", "urgent care", "pharmacy", "coffee shop", "gas station")'
      }
    },
    required: ['query']
  },
  async handler({ query }, context = {}) {
    if (!query) {
      return { error: 'Query is required for nearby search' };
    }

    const loc = context.userLocation;
    const hasCoords = loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number';
    const locationLabel = loc?.label || (hasCoords ? `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}` : 'current location');

    const mapsUrl = hasCoords
      ? `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${loc.latitude},${loc.longitude},14z`
      : `https://www.google.com/maps/search/${encodeURIComponent(query + ' near me')}`;

    const webSearchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query + (hasCoords && loc.label ? ` near ${loc.label}` : ' near me'))}`;

    return {
      query,
      location: locationLabel,
      coordinates: hasCoords ? { latitude: loc.latitude, longitude: loc.longitude } : null,
      mapsUrl,
      webSearchUrl,
      summary: `Searched for "${query}" near ${locationLabel}. Google Maps link: ${mapsUrl}`
    };
  }
};
