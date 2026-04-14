import dotenv from 'dotenv';

// Load environment variables from .env file BEFORE server starts
dotenv.config();

// Start the actual server
import('./build/index.js');
