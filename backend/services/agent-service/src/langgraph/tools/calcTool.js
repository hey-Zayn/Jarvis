/**
 * Tool definition for safe mathematical evaluation
 */
export const calcTool = {
  name: 'calculate',
  description: 'Safely evaluate mathematical arithmetic expressions (e.g. "45 * 18 + 120", "sqrt(144) + 2^3").',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'The mathematical expression to evaluate'
      }
    },
    required: ['expression']
  },
  async handler({ expression }) {
    if (!expression || typeof expression !== 'string') {
      return { error: 'Invalid expression provided' };
    }

    try {
      // Sanitize: allow only safe math characters and functions
      const sanitized = expression
        .replace(/\^/g, '**')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/abs\(/g, 'Math.abs(')
        .replace(/round\(/g, 'Math.round(')
        .replace(/floor\(/g, 'Math.floor(')
        .replace(/ceil\(/g, 'Math.ceil(')
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/log\(/g, 'Math.log(')
        .replace(/pi/gi, 'Math.PI')
        .replace(/e(?![a-z])/gi, 'Math.E');

      // Security check: ensure only Math properties, numbers, and arithmetic symbols exist
      if (!/^[0-9+\-*/%().,\sMath.PIEsqrtabroundfloorceilsintanlog]+$/.test(sanitized)) {
        return { error: 'Expression contains disallowed characters or functions' };
      }

      // Safe evaluation using Function
      const result = Function(`"use strict"; return (${sanitized});`)();
      
      if (typeof result !== 'number' || isNaN(result)) {
        return { error: 'Expression did not result in a valid number' };
      }

      return {
        expression,
        result,
        formatted: Number.isInteger(result) ? result.toString() : result.toFixed(4)
      };
    } catch (err) {
      return { error: `Calculation failed: ${err.message}` };
    }
  }
};
