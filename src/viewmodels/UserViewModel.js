import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database/db';
import { UserRepository } from '../repositories/UserRepository';

const EMPTY_ARRAY = [];

export const useUsers = () => {
  return useLiveQuery(() => db.users.toArray(), []) || EMPTY_ARRAY;
};

export const triggerUserSync = (token) => {
  UserRepository.syncUsers(token);
};
