import type { Coordinate } from './types';

export function decodePolyline(encoded: string): Coordinate[] {
  const coordinates: Coordinate[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    const latitudeResult = decodeValue(encoded, index);
    index = latitudeResult.index;
    latitude += latitudeResult.value;

    const longitudeResult = decodeValue(encoded, index);
    index = longitudeResult.index;
    longitude += longitudeResult.value;

    coordinates.push({
      latitude: latitude / 1e5,
      longitude: longitude / 1e5,
    });
  }

  return coordinates;
}

function decodeValue(encoded: string, startIndex: number) {
  let result = 0;
  let shift = 0;
  let index = startIndex;
  let byte: number;

  do {
    byte = encoded.charCodeAt(index++) - 63;
    result |= (byte & 0x1f) << shift;
    shift += 5;
  } while (byte >= 0x20);

  return {
    index,
    value: (result & 1) !== 0 ? ~(result >> 1) : result >> 1,
  };
}
