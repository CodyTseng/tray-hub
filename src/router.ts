import { Router } from 'express';
import { WebSocketServer } from 'ws';
import { Config } from './config';

export function registerRoutes(
  wssForTray: WebSocketServer,
  wssForClient: WebSocketServer,
): Router {
  const router = Router();

  const relayInfo = {
    name: 'tray-hub',
    version: '0.0.1',
    description: 'A nostr-relay-tray hub',
    software: 'tray-hub',
    supported_nips: [1, 2, 4, 11, 13, 22, 26, 28, 40],
  };

  if (Config.DOMAIN) {
    relayInfo.supported_nips.push(42);
  }

  router.get('/', (req, res) => {
    if (req.headers.accept === 'application/nostr+json') {
      return res
        .setHeader('content-type', 'application/nostr+json')
        .send(relayInfo);
    }

    res.send(
      `Currently, there are ${wssForTray.clients.size} nostr-relay-trays joined to this hub and ${wssForClient.clients.size} users connected.`,
    );
  });

  return router;
}
