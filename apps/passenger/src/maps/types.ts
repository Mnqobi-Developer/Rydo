export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type SelectedPlace = Coordinate & {
  placeId?: string;
  name: string;
  address: string;
};

export type PlaceSuggestion = {
  placeId: string;
  primaryText: string;
  secondaryText: string;
};

export type RouteEstimate = {
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline: string;
  estimatedFare: number;
};
