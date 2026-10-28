import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { RealtimeEvent } from '../models';

type Listener = (event: RealtimeEvent) => void;

interface Subscription {
  id: string;
  listeners: Set<Listener>;
}

const NUL = '\u0000';

/**
 * Minimal STOMP 1.2 client over the native WebSocket endpoint at /ws. The socket authenticates
 * with the signed-in user's access token. Guests connect anonymously and can only subscribe to
 * their session topic.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly auth = inject(AuthService);
  private socket: WebSocket | null = null;
  private connected = false;
  private identity: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private nextId = 0;
  private readonly subscriptions = new Map<string, Subscription>();

  subscribe(destination: string): Observable<RealtimeEvent> {
    return new Observable<RealtimeEvent>(observer => {
      const listener: Listener = event => observer.next(event);
      this.attach(destination, listener);
      return () => this.detach(destination, listener);
    });
  }

  private attach(destination: string, listener: Listener): void {
    let subscription = this.subscriptions.get(destination);
    const isNew = !subscription;
    if (!subscription) {
      subscription = { id: `sub-${++this.nextId}`, listeners: new Set<Listener>() };
      this.subscriptions.set(destination, subscription);
    }
    subscription.listeners.add(listener);

    const identity = this.auth.session()?.username ?? null;
    if (this.socket && this.identity !== identity) {
      this.closeSocket();
    }
    if (!this.socket) {
      this.open();
    } else if (this.connected && isNew) {
      this.send(`SUBSCRIBE\nid:${subscription.id}\ndestination:${destination}\n\n${NUL}`);
    }
  }

  private detach(destination: string, listener: Listener): void {
    const subscription = this.subscriptions.get(destination);
    if (!subscription) {
      return;
    }
    subscription.listeners.delete(listener);
    if (subscription.listeners.size === 0) {
      this.subscriptions.delete(destination);
      if (this.connected) {
        this.send(`UNSUBSCRIBE\nid:${subscription.id}\n\n${NUL}`);
      }
    }
  }

  private open(): void {
    this.identity = this.auth.session()?.username ?? null;
    const socket = new WebSocket(environment.wsUrl);
    this.socket = socket;

    socket.onopen = () => {
      const token = this.auth.accessToken();
      const authHeader = token ? `Authorization:Bearer ${token}\n` : '';
      socket.send(`CONNECT\naccept-version:1.2\nheart-beat:0,0\n${authHeader}\n${NUL}`);
    };
    socket.onmessage = (message: MessageEvent<string>) => this.handle(String(message.data));
    socket.onclose = () => {
      if (this.socket === socket) {
        this.socket = null;
        this.connected = false;
      }
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null || this.subscriptions.size === 0) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.socket && this.subscriptions.size > 0) {
        this.open();
      }
    }, 3000);
  }

  private closeSocket(): void {
    const socket = this.socket;
    this.socket = null;
    this.connected = false;
    socket?.close();
  }

  private send(frame: string): void {
    this.socket?.send(frame);
  }

  private handle(data: string): void {
    for (const raw of data.split(NUL)) {
      const frame = raw.replace(/^\n+/, '');
      if (frame.length === 0) {
        continue;
      }
      const separator = frame.indexOf('\n\n');
      const head = separator === -1 ? frame : frame.slice(0, separator);
      const body = separator === -1 ? '' : frame.slice(separator + 2);
      const lines = head.split('\n');
      const command = lines[0];
      const headers = new Map<string, string>();
      for (const line of lines.slice(1)) {
        const colon = line.indexOf(':');
        if (colon > 0) {
          headers.set(line.slice(0, colon), line.slice(colon + 1));
        }
      }

      if (command === 'CONNECTED') {
        this.connected = true;
        for (const [destination, subscription] of this.subscriptions) {
          this.send(`SUBSCRIBE\nid:${subscription.id}\ndestination:${destination}\n\n${NUL}`);
        }
      } else if (command === 'MESSAGE') {
        const destination = headers.get('destination');
        const subscription = destination ? this.subscriptions.get(destination) : undefined;
        if (subscription && body) {
          this.dispatch(subscription, body);
        }
      } else if (command === 'ERROR') {
        console.warn('Realtime server error', headers.get('message') ?? body);
      }
    }
  }

  private dispatch(subscription: Subscription, body: string): void {
    let event: RealtimeEvent;
    try {
      event = JSON.parse(body) as RealtimeEvent;
    } catch {
      return;
    }
    subscription.listeners.forEach(listener => listener(event));
  }
}
