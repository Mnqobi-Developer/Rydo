import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { apiUrl } from './adminApi';

export type AdminRealtimeEvent = 'connected' | 'reconnecting' | 'reconnected' | 'disconnected' | 'event';

export function createAdminConnection(accessToken: string) {
  return new HubConnectionBuilder()
    .withUrl(`${apiUrl}/hubs/admin`, { accessTokenFactory: () => accessToken })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();
}
