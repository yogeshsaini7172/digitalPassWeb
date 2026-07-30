import { db } from '../database/db';
import { syncGatePasses } from '../services/api';

export const GatePassRepository = {
  syncGatePasses: async (token) => {
    try {
      const syncRecord = await db.syncMetadata.get('gatePasses');
      const lastSyncTime = syncRecord ? syncRecord.lastSyncTime : 0;
      let offset = 0;
      let limit = 500;
      let hasMore = true;
      let latestServerTime = 0;

      while (hasMore) {
        const payload = { token, lastSyncTime, offset, limit };
        const response = await syncGatePasses(payload);

        if (response) {
          if (response.serverTime > 0) {
            latestServerTime = response.serverTime;
          }

          await db.transaction('rw', db.gatePasses, async () => {
            if (response.deletedGatePassIds && response.deletedGatePassIds.length > 0) {
              await db.gatePasses.bulkDelete(response.deletedGatePassIds);
            }

            if (response.updatedGatePasses && response.updatedGatePasses.length > 0) {
              const entities = response.updatedGatePasses.map(it => {
                const id = Number(it.gatePassId);
                return { gatePassId: id, ...it };
              });
              await db.gatePasses.bulkPut(entities);
            }
          });

          hasMore = response.hasMore || false;
          offset += limit;
        } else {
          hasMore = false;
        }
      }

      if (latestServerTime > lastSyncTime) {
        await db.syncMetadata.put({ collection: 'gatePasses', lastSyncTime: latestServerTime });
      }
    } catch (error) {
      console.error('Error syncing gate passes:', error);
    }
  }
};
