import Express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { Config } from './config';
import { startRelay } from './relay';
import { registerRoutes } from './router';
import { TrayHub } from './tray-hub';
import { handleUpgrade } from './upgrade';

async function bootstrap() {
  const app = Express();
  const server = createServer(app);

  const wssForClient = new WebSocketServer({ noServer: true });
  const wssForTray = new WebSocketServer({ noServer: true });
  handleUpgrade(server, wssForClient, wssForTray);

  const trayHub = new TrayHub(wssForTray);
  startRelay(wssForClient, trayHub);

  app.use('/', registerRoutes(wssForTray, wssForClient));

  server.listen(Config.PORT, () => {
    console.log('Server is running on port 3000');
  });
}
bootstrap();
