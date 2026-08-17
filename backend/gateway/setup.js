// Load environment variables from .env file
import dotenv from 'dotenv';
console.log('setup.js: About to call dotenv.config()');
const result = dotenv.config();
console.log('setup.js: dotenv.config() result =', result);
console.log('setup.js: After dotenv.config(), process.env =', process.env);
console.log('setup.js: After dotenv.config(), PROTO_ROOT =', process.env.PROTO_ROOT);
// Override with hardcoded value for testing
process.env.PROTO_ROOT = '../../shared/proto';
console.log('setup.js: After override, PROTO_ROOT =', process.env.PROTO_ROOT);