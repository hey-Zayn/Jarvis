import { timeTool } from './timeTool.js';
import { calcTool } from './calcTool.js';
import { weatherTool } from './weatherTool.js';
import { searchTool } from './searchTool.js';
import { locationTool, searchNearbyTool } from './locationTool.js';
import { memoryAccessTool, memoryStoreTool } from './memoryTool.js';
import { browserTools } from './browserTools.js';

export class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.registerDefaults();
  }

  registerDefaults() {
    this.register(timeTool);
    this.register(calcTool);
    this.register(weatherTool);
    this.register(searchTool);
    this.register(locationTool);
    this.register(searchNearbyTool);
    this.register(memoryAccessTool);
    this.register(memoryStoreTool);
    browserTools.forEach((tool) => this.register(tool));
  }

  register(tool) {
    if (!tool.name || typeof tool.handler !== 'function') {
      throw new Error(`Invalid tool registration: missing name or handler for ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name) {
    return this.tools.get(name);
  }

  has(name) {
    return this.tools.has(name);
  }

  /**
   * Convert tools to OpenAI / Groq compatible tool schemas
   */
  toGroqToolDefinitions() {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters || { type: 'object', properties: {} }
      }
    }));
  }

  /**
   * Execute a tool safely with a timeout guard
   */
  async execute(name, args = {}, context = {}, timeoutMs = 4000) {
    const tool = this.tools.get(name);
    if (!tool) {
      return { error: `Tool "${name}" not found in registry.` };
    }

    try {
      const execPromise = tool.handler(args, context);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Tool execution for "${name}" timed out after ${timeoutMs}ms`)), timeoutMs)
      );

      const result = await Promise.race([execPromise, timeoutPromise]);
      return result;
    } catch (err) {
      return { error: `Error executing tool "${name}": ${err.message}` };
    }
  }
}
