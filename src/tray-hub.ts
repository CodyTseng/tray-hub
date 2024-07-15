import {
  EventRepository,
  Event,
  EventRepositoryUpsertResult,
  Filter,
  MessageType,
  EventUtils,
} from '@nostr-relay/common';
import { Validator } from '@nostr-relay/validator';
import { randomUUID } from 'crypto';
import { WebSocketServer } from 'ws';

export class TrayHub extends EventRepository {
  private readonly findJobs = new Map<
    string,
    {
      eventCb: (event: Event) => void;
      eoseCb: () => void;
    }
  >();

  constructor(private readonly wss: WebSocketServer) {
    super();
    const validator = new Validator();

    wss.on('connection', (ws) => {
      ws.on('message', (message) => {
        const [type, ...payload] = JSON.parse(message.toString());
        switch (type) {
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

  find(filter: Filter): Promise<Event[]> {
    return new Promise((resolve) => {
      const subId = randomUUID();
      const eventMap = new Map<string, Event>();
      let trayCount = 0;
      let eoseCount = 0;
      const finish = () => {
        this.findJobs.delete(subId);
        if (timer) {
          clearTimeout(timer);
        }
        this.broadcast([MessageType.CLOSE, subId]);
        resolve(Array.from(eventMap.values()));
      };
      const timer = setTimeout(finish, 5000);

      const eventCb = (event: Event) => {
        const validateErrorMsg = EventUtils.validate(event);
        if (validateErrorMsg) {
          return;
        }
        eventMap.set(event.id, event);
        if (eventMap.size >= (filter.limit ?? 100)) {
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
