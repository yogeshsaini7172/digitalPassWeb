import { db } from '../database/db';
import { syncVisitorPasses } from '../services/api';

export const VisitorRepository = {
  syncVisitors: async (token) => {
    try {
      const syncRecord = await db.syncMetadata.get('visitors');
      const lastSyncTime = syncRecord ? syncRecord.lastSyncTime : 0;
      let offset = 0;
      let limit = 500;
      let hasMore = true;
      let latestServerTime = 0;

      while (hasMore) {
        const payload = { token, lastSyncTime, offset, limit };
        const response = await syncVisitorPasses(payload);

        if (response) {
          if (response.serverTime > 0) {
            latestServerTime = response.serverTime;
          }

          await db.transaction('rw', db.visitors, async () => {
            if (response.deletedVisitorIds && response.deletedVisitorIds.length > 0) {
              await db.visitors.bulkDelete(response.deletedVisitorIds);
            }

            if (response.updatedVisitors && response.updatedVisitors.length > 0) {
              const entities = response.updatedVisitors.map(it => {
                const id = Number(it.visitorId);
                return { visitorId: id, ...it };
              });
              await db.visitors.bulkPut(entities);
            }
          });

          hasMore = response.hasMore || false;
          offset += limit;
        } else {
          hasMore = false;
        }
      }

      if (latestServerTime > lastSyncTime) {
        await db.syncMetadata.put({ collection: 'visitors', lastSyncTime: latestServerTime });
      }
    } catch (error) {
      console.error('Error syncing visitors:', error);
    }
  }
};
