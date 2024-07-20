import { Server } from 'http';
import { WebSocketServer } from 'ws';
import { Config } from './config';

export function handleUpgrade(
  server: Server,
  wssForClient: WebSocketServer,
  wssForTray: WebSocketServer,
) {
  server.on('upgrade', function upgrade(request, socket, head) {
    const baseUrl = 'ws://' + request.headers.host + '/';
    const pathname = new URL(request.url ?? baseUrl, baseUrl).pathname;

    if (pathname === '/') {
      wssForClient.handleUpgrade(request, socket, head, function done(ws) {
        wssForClient.emit('connection', ws, request);
      });
    } else if (pathname === '/join') {
      wssForTray.handleUpgrade(request, socket, head, function done(ws) {
        if (
          Config.MAX_CONNECTIONS !== undefined &&
          wssForTray.clients.size >= Config.MAX_CONNECTIONS
        ) {
          socket.destroy(new Error('Too many connections'));
          return;
        }

        if (Config.PASSWORD) {
          const basic = request.headers.authorization;
          if (!basic) {
            socket.destroy();
            return;
          }
          const decoded = Buffer.from(basic.split(' ')[1], 'base64').toString();
          const [username, password] = decoded.split(':');
          if ((password.length ? password : username) !== Config.PASSWORD) {
            socket.destroy(new Error('Unauthorized'));
            return;
          }
        }
        wssForTray.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });
}
