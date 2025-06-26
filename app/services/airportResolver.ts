import * as geolib from 'geolib';
import { airports, Airport } from '../data/airports';
import config from '../src/config';
const mockMode = config.mockMode;

export type ResolvedAirport = {
  airport: Airport | null;
  isMock: boolean;
};

export function resolveNearestAirport(lat: number, lon: number): ResolvedAirport {
  const radiusKm = 5;
  let closest: Airport | null = null;
  let closestDistance = Number.MAX_SAFE_INTEGER;

  for (const airport of airports) {
    const distance = geolib.getDistance(
      { latitude: lat, longitude: lon },
      { latitude: airport.lat, longitude: airport.lon }
    );
    const km = distance / 1000;

    if (km < closestDistance && km <= radiusKm) {
      closestDistance = km;
      closest = airport;
    }
  }

  if (mockMode && !closest) {
    console.log('[MOCK MODE] Ativo — retornando aeroporto mockado');
    return { airport: airports.find(a => a.iata === 'GRU')!, isMock: true };
  }

  if (!closest) {
    console.log('[LÓGICA REAL] Nenhum aeroporto próximo — retornando null');
    return { airport: null, isMock: false };
  }

  console.log(`[LÓGICA REAL] Mais próximo: ${closest.iata} a ${closestDistance.toFixed(2)} km`);
  return { airport: closest, isMock: false };
}
