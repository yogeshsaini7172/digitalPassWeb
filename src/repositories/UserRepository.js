import { db } from '../database/db';
import { getMembersForUserManagement, getBatchesBasedOnDepartment } from '../services/api';

export const UserRepository = {
  syncUsers: async (token) => {
    try {
      const syncRecord = await db.syncMetadata.get('users');
      const lastSyncTime = syncRecord ? syncRecord.lastSyncTime : 0;
      
      let offset = 0;
      const limit = 500;
      let hasMore = true;
      let latestServerTime = 0;

      while (hasMore) {
        const response = await getMembersForUserManagement(token, lastSyncTime, offset, limit);
        if (response && response.updatedUsers !== undefined) {
          const { updatedUsers: users, deletedEmails, serverTime, hasMore: moreFlag } = response;
          
          if (serverTime && serverTime > latestServerTime) {
            latestServerTime = serverTime;
          }

          await db.transaction('rw', db.users, async () => {
            if (users && users.length > 0) {
              await db.users.bulkPut(users);
            }
            if (deletedEmails && deletedEmails.length > 0) {
              await db.users.bulkDelete(deletedEmails);
            }
          });
          
          hasMore = !!moreFlag;
          offset += limit;
        } else {
          hasMore = false;
        }
      }
      
      if (latestServerTime > lastSyncTime) {
        await db.syncMetadata.put({ collection: 'users', lastSyncTime: latestServerTime });
      }
    } catch (error) {
      console.error("Error syncing users to IndexedDB:", error);
    }
  },

  syncBatches: async (token, role, campus, department) => {
    // Batches don't use lastSyncTime in backend yet, so we just fetch and replace
    try {
      const data = {
        token,
        role,
        campus,
        department
      };
      // For web, it relies on standard axios calls inside api.js
      const response = await getBatchesBasedOnDepartment(data);
      if (response && Array.isArray(response)) {
        const batches = response;
        // The backend returns an array of strings. We need to store them in IndexedDB.
        const batchRecords = batches.map(batchName => ({
          id: `${department}-${campus}-${batchName}`,
          name: batchName,
          department,
          campus
        }));

        await db.transaction('rw', db.batches, async () => {
          // Clear old batches for this dept/campus to prevent stale data
          await db.batches.where({ department, campus }).delete();
          // Insert new ones
          await db.batches.bulkPut(batchRecords);
        });
      }
    } catch (error) {
      console.error("Error syncing batches to IndexedDB:", error);
    }
  }
};
