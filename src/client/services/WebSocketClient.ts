import { KeosEvent, KeosSession } from '../types';

export type EventCallback = (event: KeosEvent) => void;
export type SessionsCallback = (sessions: KeosSession[]) => void;
export type StatusCallback = (online: boolean) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private eventListeners: EventCallback[] = [];
  private sessionsListeners: SessionsCallback[] = [];
  private statusListeners: StatusCallback[] = [];
  private reconnectTimer: number | null = null;

  constructor(port = 4040) {
    const host = window.location.hostname || 'localhost';
    this.url = `ws://${host}:${port}`;
  }

  public connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.notifyStatus(true);
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (msgEvent) => {
        try {
          const data = JSON.parse(msgEvent.data);
          if (data.type === 'EVENT' && data.event) {
            this.notifyEvent(data.event);
          } else if (
            (data.type === 'SESSIONS_UPDATE' || data.type === 'SESSION_JOINED') &&
            data.sessions
          ) {
            this.notifySessions(data.sessions);
          }
        } catch {
          // ignore parsing error
        }
      };

      this.ws.onclose = () => {
        this.notifyStatus(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.notifyStatus(false);
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  public onEvent(callback: EventCallback) {
    this.eventListeners.push(callback);
  }

  public onSessions(callback: SessionsCallback) {
    this.sessionsListeners.push(callback);
  }

  public onStatus(callback: StatusCallback) {
    this.statusListeners.push(callback);
  }

  public playScenario(scenario: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'PLAY_SCENARIO', scenario }));
    } else {
      // Fallback via HTTP POST
      fetch(`http://${window.location.hostname || 'localhost'}:4040/api/mock/${scenario}`, {
        method: 'POST'
      }).catch(() => {});
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2000);
  }

  private notifyEvent(event: KeosEvent) {
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }

  private notifySessions(sessions: KeosSession[]) {
    for (const listener of this.sessionsListeners) {
      listener(sessions);
    }
  }

  private notifyStatus(online: boolean) {
    for (const listener of this.statusListeners) {
      listener(online);
    }
  }
}
