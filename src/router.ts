import { Router } from 'express';
import { WebSocketServer } from 'ws';
import * as packageJson from '../package.json';
import { Config } from './config';

export function registerRoutes(
  wssForTray: WebSocketServer,
  wssForClient: WebSocketServer,
): Router {
  const router = Router();

  const relayInfo = {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
    pubkey: Config.PUBKEY,
    contact: Config.CONTACT,
    software: packageJson.repository.url,
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
