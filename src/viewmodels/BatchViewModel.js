import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database/db';
import { BatchRepository } from '../repositories/BatchRepository';

const EMPTY_ARRAY = [];

export const useBatches = () => {
  return useLiveQuery(() => db.batches.toArray(), []) || EMPTY_ARRAY;
};

export const triggerBatchSync = async (token, campus) => {
  await BatchRepository.syncBatches(token, campus);
};
