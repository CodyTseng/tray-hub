import { Server } from 'http';
import { WebSocketServer } from 'ws';

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
        wssForTray.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });
}
