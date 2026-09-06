import assert from 'node:assert/strict';
import test from 'node:test';
import { locationTool, searchNearbyTool } from '../src/langgraph/tools/locationTool.js';
import { searchTool } from '../src/langgraph/tools/searchTool.js';
import { ToolRegistry } from '../src/langgraph/tools/registry.js';

test('locationTool returns user coordinates and label when available', async () => {
  const context = {
    userLocation: {
      latitude: 31.5204,
      longitude: 74.3587,
      label: 'Lahore, Pakistan'
    }
  };

  const result = await locationTool.handler({}, context);
  assert.equal(result.hasLocation, true);
  assert.equal(result.latitude, 31.5204);
  assert.equal(result.longitude, 74.3587);
  assert.equal(result.label, 'Lahore, Pakistan');
});

test('locationTool returns graceful message when location is not set', async () => {
  const result = await locationTool.handler({}, {});
  assert.equal(result.hasLocation, false);
  assert.ok(result.message.includes('not currently shared'));
});

test('searchNearbyTool constructs Google Maps and search queries for places', async () => {
  const context = {
    userLocation: {
      latitude: 40.7128,
      longitude: -74.0060,
      label: 'New York, NY'
    }
  };

  const result = await searchNearbyTool.handler({ query: 'hospital' }, context);
  assert.equal(result.query, 'hospital');
  assert.equal(result.location, 'New York, NY');
  assert.ok(result.mapsUrl.includes('google.com/maps/search/hospital'));
  assert.ok(result.mapsUrl.includes('40.7128,-74.006'));
});

test('searchTool handles query and returns structured results', async () => {
  const result = await searchTool.handler({ query: 'Albert Einstein' });
  assert.equal(result.query, 'Albert Einstein');
  assert.ok(Array.isArray(result.results));
  assert.ok(result.results.length > 0);
  assert.ok(result.results[0].title);
  assert.ok(result.results[0].url);
});

test('ToolRegistry includes all new tools', () => {
  const registry = new ToolRegistry();
  assert.ok(registry.has('get_user_location'));
  assert.ok(registry.has('search_nearby'));
  assert.ok(registry.has('search_web'));
  assert.ok(registry.has('clickElement'));
  assert.ok(registry.has('openTab'));
});
