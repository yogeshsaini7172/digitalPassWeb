import { db } from '../database/db';
import { syncInterInstitutionalGatePasses } from '../services/api';

export const InterInstitutionalGatePassRepository = {
  syncInterInstitutionalGatePasses: async (token) => {
    try {
      const syncRecord = await db.syncMetadata.get('interInstitutionalGatePasses');
      const lastSyncTime = syncRecord ? syncRecord.lastSyncTime : 0;
      let offset = 0;
      let limit = 500;
      let hasMore = true;
      let latestServerTime = 0;

      while (hasMore) {
        const payload = { token, lastSyncTime, offset, limit };
        const response = await syncInterInstitutionalGatePasses(payload);

        if (response) {
          if (response.serverTime > 0) {
            latestServerTime = response.serverTime;
          }

          await db.transaction('rw', db.interInstitutionalGatePasses, async () => {
            if (response.deletedGatePassIds && response.deletedGatePassIds.length > 0) {
              await db.interInstitutionalGatePasses.bulkDelete(response.deletedGatePassIds);
            }

            if (response.updatedGatePasses && response.updatedGatePasses.length > 0) {
              const entities = response.updatedGatePasses.map(it => {
                const id = Number(it.gatePassId);
                return { gatePassId: id, ...it };
              });
              await db.interInstitutionalGatePasses.bulkPut(entities);
            }
          });

          hasMore = response.hasMore || false;
          offset += limit;
        } else {
          hasMore = false;
        }
      }

      if (latestServerTime > lastSyncTime) {
        await db.syncMetadata.put({ collection: 'interInstitutionalGatePasses', lastSyncTime: latestServerTime });
      }
    } catch (error) {
      console.error('Error syncing inter-institutional gate passes:', error);
    }
  }
};
