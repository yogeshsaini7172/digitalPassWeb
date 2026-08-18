import { io } from 'socket.io-client';
import { db } from '../database/db';
import { 
  getRecentUpdatedGatePass, 
  getRecentUpdatedInterInstitutionalGatePass, 
  getRecentUpdatedVisitor 
} from './api';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://10.84.201.1:5000';

const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: false,
});

let currentToken = null;

socket.on('connect', () => {
  console.log('Socket connected, joining room...');
  if (currentToken) {
    socket.emit('joinRoom', currentToken);
  }
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});

// Helper to fetch and upsert single pass
export const fetchAndUpsertPass = async (type, id) => {
  if (!currentToken) return;
  try {
    let payload = { token: currentToken };
    let response, dbTable;

    if (type === 'gatePass') {
      payload.gatePassId = id;
      response = await getRecentUpdatedGatePass(payload);
      dbTable = db.gatePasses;
    } else if (type === 'interInstitutionalGatePass') {
      payload.gatePassId = id;
      response = await getRecentUpdatedInterInstitutionalGatePass(payload);
      dbTable = db.interInstitutionalGatePasses;
    } else if (type === 'visitor') {
      payload.visitorId = id;
      response = await getRecentUpdatedVisitor(payload);
      dbTable = db.visitors;
    }

    if (response) {
      if (type === 'gatePass' || type === 'interInstitutionalGatePass') {
        response.gatePassId = Number(response.gatePassId);
      } else {
        response.visitorId = Number(response.visitorId);
      }
      await dbTable.put(response);
    }
  } catch (error) {
    console.error(`Error fetching updated ${type} ${id}:`, error);
  }
};

// Gate Pass Events
socket.on('gatePassInsert', (data) => fetchAndUpsertPass('gatePass', data.gatePassId));
socket.on('gatePassStatusUpdate', (data) => fetchAndUpsertPass('gatePass', data.gatePassId));
socket.on('gatePassUpdate', (data) => fetchAndUpsertPass('gatePass', data.gatePassId));

// Inter-Institutional Events
socket.on('interInstitutionalGatePassInsert', (data) => fetchAndUpsertPass('interInstitutionalGatePass', data.gatePassId));
socket.on('interInstitutionalGatePassStatusUpdate', (data) => fetchAndUpsertPass('interInstitutionalGatePass', data.gatePassId));
socket.on('interInstitutionalGatePassUpdate', (data) => fetchAndUpsertPass('interInstitutionalGatePass', data.gatePassId));

// Visitor Events
socket.on('visitorInsert', (data) => fetchAndUpsertPass('visitor', data.visitorId));
socket.on('visitorUpdate', (data) => fetchAndUpsertPass('visitor', data.visitorId));

export const connectSocket = (token) => {
  currentToken = token;
  if (!socket.connected) {
    socket.connect();
  } else {
    socket.emit('joinRoom', token);
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export default socket;
