import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { apiUrl } from './driverApi';

export function createRideConnection(accessToken: string) {
  return new HubConnectionBuilder()
    .withUrl(`${apiUrl}/hubs/rides`, { accessTokenFactory: () => accessToken })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();
}
