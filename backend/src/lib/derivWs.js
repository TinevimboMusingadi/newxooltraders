import { config } from '../config.js';

const LEGACY_WS = `wss://ws.derivws.com/websockets/v3?app_id=${config.deriv.appId || '1089'}`;

export function getDerivWsUrl() {
  return process.env.DERIV_WS_URL || LEGACY_WS;
}

export function derivWsRequest(payload, { timeoutMs = 10000, match = (data) => data.msg_type } = {}) {
  return new Promise(async (resolve, reject) => {
    const WebSocket = (await import('ws')).default;
    const ws = new WebSocket(getDerivWsUrl());
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Deriv WebSocket timeout'));
    }, timeoutMs);

    ws.on('open', () => {
      ws.send(JSON.stringify(payload));
    });

    ws.on('message', (raw) => {
      const data = JSON.parse(raw.toString());
      if (data.error) {
        clearTimeout(timeout);
        ws.close();
        reject(new Error(data.error.message || 'Deriv API error'));
        return;
      }
      const hit = typeof match === 'string' ? data.msg_type === match : match(data);
      if (hit) {
        clearTimeout(timeout);
        ws.close();
        resolve(data);
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}
