import axios from 'axios';
import { mockFlightLabsSchedulesResponse } from './mockFlights'; // ajuste o caminho se necessário
import config from '../src/config';
const WORKER_URL = 'https://flight-api-worker.rrosset91.workers.dev';

const USE_MOCK = config.mockMode; // Troque para false quando quiser usar o Worker de verdade

export async function fetchFlights(iata: string, limit = 50, offset = 0) {
  if (USE_MOCK) {
    const all = mockFlightLabsSchedulesResponse.data;
    return {
      success: true,
      type: 'departure',
      data: all.slice(offset, offset + limit)
    };
  }else{
  try {
    const response = await axios.get(
      `${WORKER_URL}?iataCode=${iata}&type=departure&limit=${limit}&offset=${offset}`
    );
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar voos:', error);
    return { success: false, data: [] };
  }
}
}
