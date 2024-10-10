import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket!: Socket;
  private connectionStatus = new BehaviorSubject<boolean>(false);

  constructor() {
    console.log('WebSocketService: Initializing');
    this.initializeSocket();
  }

  private initializeSocket() {
    console.log('WebSocketService: Attempting to connect to', environment.wsUrl);
    this.socket = io(environment.wsUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket']
    });

    this.setupConnectionListeners();
  }

  private setupConnectionListeners() {
    this.socket.on('connect', () => {
      console.log('WebSocketService: Connected successfully');
      this.connectionStatus.next(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocketService: Disconnected:', reason);
      this.connectionStatus.next(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocketService: Connection error:', error);
      this.connectionStatus.next(false);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocketService: Reconnected after', attemptNumber, 'attempts');
      this.connectionStatus.next(true);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('WebSocketService: Reconnection error:', error);
    });
  }

  listen(eventName: string): Observable<any> {
    console.log(`WebSocketService: Setting up listener for event: ${eventName}`);
    return new Observable((subscriber) => {
      this.socket.on(eventName, (data) => {
        console.log(`WebSocketService: Received ${eventName} event:`, data);
        subscriber.next(data);
      });
    });
  }

  emit(eventName: string, data: any): void {
    console.log(`WebSocketService: Attempting to emit ${eventName} event:`, data);
    if (this.socket.connected) {
      this.socket.emit(eventName, data);
      console.log(`WebSocketService: ${eventName} event emitted successfully`);
    } else {
      console.error(`WebSocketService: Failed to emit ${eventName} event: Socket not connected`);
      // Optionally, you could try to reconnect here
      this.reconnect();
    }
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connectionStatus.asObservable();
  }

  

  reconnect(): void {
    console.log('WebSocketService: Attempting to reconnect');
    if (this.socket) {
      this.socket.disconnect();
    }
    this.initializeSocket();
  }

  disconnect(): void {
    console.log('WebSocketService: Disconnecting');
    if (this.socket) {
      this.socket.disconnect();
    }
    this.connectionStatus.next(false);
  }
}