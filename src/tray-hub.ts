import {
  Event,
  EventRepository,
  EventRepositoryUpsertResult,
  EventUtils,
  Filter,
  MessageType,
} from '@nostr-relay/common';
import { Validator } from '@nostr-relay/validator';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';
import { WebSocket, WebSocketServer } from 'ws';
import { Config } from './config';

export class TrayHub extends EventRepository {
  private readonly findJobs = new Map<
    string,
    {
      eventCb: (event: Event) => void;
      eoseCb: () => void;
    }
  >();
  private readonly map = new WeakMap<WebSocket, null | object>();

  constructor(private readonly wss: WebSocketServer) {
    super();
    const validator = new Validator();

    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.readyState === 1) {
          ws.ping();
        }
      });
    }, 10000);

    wss.on('connection', (ws) => {
      let terminateTimer: NodeJS.Timeout;
      this.map.set(ws, null);
      setTimeout(() => {
        if (!this.map.get(ws)) {
          ws.close();
        }
      }, 2000);

      ws.on('pong', () => {
        // Reset the timeout for this WebSocket connection
        clearTimeout(terminateTimer);
        terminateTimer = setTimeout(() => {
          ws.terminate();
        }, 30000);
      });

      ws.on('close', () => {
        clearTimeout(terminateTimer);
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (!Array.isArray(message)) {
          return;
        }
        const [type, ...payload] = message;
        switch (type) {
          case 'JOIN':
            this.map.set(ws, payload[0]);
            ws.send(JSON.stringify(['JOINED']));
            break;
          case MessageType.EVENT: {
            const [subId, rawEvent] = payload;
            const job = this.findJobs.get(subId);
            if (job) {
              validator.validateEvent(rawEvent).then((event) => {
                job.eventCb(event);
              });
            }
            break;
          }
          case MessageType.EOSE: {
            const [subId] = payload;
            const job = this.findJobs.get(subId);
            if (job) {
              job.eoseCb();
            }
            break;
          }
          default:
            break;
        }
      });
    });
  }

  isSearchSupported(): boolean {
    return false;
  }

  upsert(event: Event): EventRepositoryUpsertResult {
    this.broadcast([MessageType.EVENT, event]);
    return { isDuplicate: false };
  }

  find(filter: Filter): Observable<Event> {
    const subId = randomUUID();
    return new Observable((subscriber) => {
      let trayCount = 0;
      let eoseCount = 0;
      let eventIds = new Set<string>();
      const finish = () => {
        this.findJobs.delete(subId);
        if (timer) {
          clearTimeout(timer);
        }
        this.broadcast([MessageType.CLOSE, subId]);
        subscriber.complete();
      };
      const timer = setTimeout(finish, 5000);

      const eventCb = (event: Event) => {
        if (!Config.TRUST_RELAY) {
          const validateErrorMsg = EventUtils.validate(event);
          if (validateErrorMsg) {
            return;
          }
          const isMatchFilter = EventUtils.isMatchingFilter(event, filter);
          if (!isMatchFilter) {
            return;
          }
        }
        if (eventIds.has(event.id)) return;

        subscriber.next(event);
        eventIds.add(event.id);
        if (eventIds.size >= (filter.limit ?? 100)) {
          finish();
        }
      };
      const eoseCb = () => {
        eoseCount++;
        if (eoseCount < trayCount) return;

        finish();
      };
      this.findJobs.set(subId, { eventCb: eventCb, eoseCb: eoseCb });

      trayCount = this.broadcast([MessageType.REQ, subId, filter]);
      if (trayCount === 0) {
        finish();
      }
    });
  }

  broadcast(msg: unknown): number {
    let count = 0;
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify(msg));
        count++;
      }
    });
    return count;
  }

  destroy(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.findJobs.clear();
      this.wss.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
