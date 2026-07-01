import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { apiUrl, TripResponse } from './tripsApi';

export function createRideConnection(accessToken: string) {
  return new HubConnectionBuilder()
    .withUrl(`${apiUrl}/hubs/rides`, { accessTokenFactory: () => accessToken })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();
}

export type TripUpdatedEvent = TripResponse & {
  id?: string;
  passengerId?: string;
};
