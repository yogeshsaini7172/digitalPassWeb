import { db } from '../database/db';
import { getAllBatches } from '../services/api';

export class BatchRepository {
  static async syncBatches(token, requestedCampus) {
    try {
      const campus = requestedCampus || localStorage.getItem('userCampus');
      if (!campus) return;

      const batches = await getAllBatches({ token, campus });
      
      await db.transaction('rw', db.batches, async () => {
        await db.batches.clear();
        if (batches) {
          const students = batches.student || [];
          const members = batches.member || [];
          
          const studentInserts = students.map(b => ({
            id: `student-${b}-${campus}`,
            name: b,
            type: 'student',
            campus
          }));
          
          const memberInserts = members.map(b => ({
            id: `member-${b}-${campus}`,
            name: b,
            type: 'member',
            campus
          }));

          await db.batches.bulkPut([...studentInserts, ...memberInserts]);
        }
      });
      console.log('Batch sync complete');
    } catch (error) {
      console.error('Batch sync failed:', error);
    }
  }
}
