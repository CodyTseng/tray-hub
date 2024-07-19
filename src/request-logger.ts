import type {
  ClientContext,
  HandleMessagePlugin,
  HandleMessageResult,
  IncomingMessage,
} from '@nostr-relay/common';
import path from 'path';
import Pino from 'pino';
import { mkdirSync, statSync } from 'fs';

export class RequestLogger implements HandleMessagePlugin {
  private readonly logger: Pino.Logger;

  constructor(dirPath?: string) {
    if (dirPath) {
      ensureDirSync(dirPath);
      this.logger = Pino({
        transport: {
          target: 'pino/file',
          options: { destination: path.join(dirPath, 'requests.log') },
        },
      });
    } else {
      this.logger = Pino();
    }
  }

  async handleMessage(
    _ctx: ClientContext,
    [messageType]: IncomingMessage,
    next: () => Promise<HandleMessageResult>,
  ): Promise<HandleMessageResult> {
    const start = Date.now();
    const result = await next();
    this.logger.info(
      { messageType, duration: Date.now() - start },
      `${messageType} request processed in ${Date.now() - start}ms`,
    );
    return result;
  }
}

export function ensureDirSync(dirPath: string) {
  const dirStat = _statSync(dirPath);

  if (!dirStat) {
    mkdirSync(dirPath, { recursive: true });
  } else if (!dirStat.isDirectory()) {
    throw new Error(`Log directory '${dirPath}' is not a directory`);
  }
}

function _statSync(dirPath: string) {
  try {
    return statSync(dirPath);
  } catch {
    return false;
  }
}
