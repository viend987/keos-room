import { WebSocketHub } from './server/WebSocketHub.js';

const PORT = parseInt(process.env.PORT || '4040', 10);
const hub = new WebSocketHub(PORT);

hub.start();

process.on('SIGINT', () => {
  console.log('[KEOS BRIDGE] Shutting down cleanly...');
  hub.stop();
  process.exit(0);
});
