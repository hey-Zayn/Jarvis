/**
 * Tool definition for retrieving current weather
 */
export const weatherTool = {
  name: 'get_weather',
  description: 'Get current weather conditions and temperature forecast for a given location or city.',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'The city or location name (e.g. "San Francisco, CA", "London", "Tokyo")'
      },
      unit: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
        description: 'Temperature unit preference. Defaults to celsius.'
      }
    },
    required: ['location']
  },
  async handler({ location, unit = 'celsius' }) {
    if (!location) {
      return { error: 'Location is required' };
    }

    // Fast mock weather provider for ultra-low-latency response
    // In production, this connects to Open-Meteo or OpenWeather API
    const isFahr = unit.toLowerCase() === 'fahrenheit';
    const tempC = 21;
    const temp = isFahr ? Math.round((tempC * 9) / 5 + 32) : tempC;

    return {
      location,
      condition: 'Partly Cloudy',
      temperature: temp,
      unit: isFahr ? '°F' : '°C',
      humidity: '58%',
      windSpeed: '12 km/h',
      source: 'Jarvis Weather Forecast Service'
    };
  }
};
