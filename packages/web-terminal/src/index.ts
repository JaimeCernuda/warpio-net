/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { WarpioTerminalServer } from './terminalServer.js';

async function main() {
  const server = new WarpioTerminalServer();
  const port = parseInt(process.env.PORT || '3003', 10);
  
  try {
    await server.start(port);
  } catch (error) {
    console.error('Failed to start Warpio Terminal Server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

main().catch(console.error);