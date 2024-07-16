import { createOutgoingNoticeMessage, NostrRelay } from '@nostr-relay/core';
import { Validator } from '@nostr-relay/validator';
import { join } from 'path';
import { WebSocketServer } from 'ws';
import { Config } from './config';
import { RequestLogger } from './request-logger';
import { TrayHub } from './tray-hub';

export function startRelay(wss: WebSocketServer, trayHub: TrayHub) {
  const relay = new NostrRelay(trayHub, { domain: Config.DOMAIN });
  const logsDir = Config.LOG_DIR ?? join(__dirname, '../logs');
  relay.register(new RequestLogger(logsDir));

  const validator = new Validator();

  wss.on('connection', (ws) => {
    // Handle a new client connection. This method should be called when a new client connects to the Nostr Relay server.
    relay.handleConnection(ws);

    ws.on('message', async (data) => {
      try {
        // Validate the incoming message.
        const message = await validator.validateIncomingMessage(data);
        // Handle the incoming message.
        await relay.handleMessage(ws, message);
      } catch (error) {
        if (error instanceof Error) {
          ws.send(JSON.stringify(createOutgoingNoticeMessage(error.message)));
        }
      }
    });

    // Handle a client disconnection. This method should be called when a client disconnects from the Nostr Relay server.
    ws.on('close', () => relay.handleDisconnect(ws));

    ws.on('error', (error) => {
      ws.send(JSON.stringify(createOutgoingNoticeMessage(error.message)));
    });
  });
}
