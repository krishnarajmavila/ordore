import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket;
  private connectionStatus = new BehaviorSubject<boolean>(false);

  constructor() {
    console.log('Initializing WebSocket connection to:', environment.wsUrl);
    this.socket = io(environment.wsUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.setupConnectionListeners();
  }

  private setupConnectionListeners() {
    this.socket.on('connect', () => {
      console.log('WebSocket connected successfully');
      this.connectionStatus.next(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.connectionStatus.next(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.connectionStatus.next(false);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      this.connectionStatus.next(true);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('WebSocket reconnection error:', error);
    });
  }

  listen(eventName: string): Observable<any> {
    console.log(`Setting up listener for event: ${eventName}`);
    return new Observable((subscriber) => {
      this.socket.on(eventName, (data) => {
        console.log(`Received ${eventName} event:`, data);
        subscriber.next(data);
      });
    });
  }

  emit(eventName: string, data: any): void {
    console.log(`Emitting ${eventName} event:`, data);
    this.socket.emit(eventName, data);
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connectionStatus.asObservable();
  }

  disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting WebSocket');
      this.socket.disconnect();
    }
  }
}