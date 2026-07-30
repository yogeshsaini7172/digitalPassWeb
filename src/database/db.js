import Dexie from 'dexie';

export const db = new Dexie('DigitalPassDB');

db.version(3).stores({
  gatePasses: 'gatePassId, applyEmail, status, applyDate, lastUpdatedAt',
  interInstitutionalGatePasses: 'gatePassId, applyEmail, status, applyDate, destinationCampus, lastUpdatedAt',
  visitors: 'visitorId, applyEmail, status, meetDate, entryDate, lastUpdatedAt',
  users: 'email, role, department, campus, lastUpdatedAt',
  batches: 'id, department, campus',
  syncMetadata: 'collection, lastSyncTime'
});

db.version(4).stores({
  gatePasses: 'gatePassId, applyEmail, status, applyDate, lastUpdatedAt',
  interInstitutionalGatePasses: 'gatePassId, applyEmail, status, applyDate, destinationCampus, lastUpdatedAt',
  visitors: 'visitorId, applyEmail, status, meetDate, entryDate, lastUpdatedAt',
  users: 'email, role, department, campus, lastUpdatedAt',
  batches: 'id, department, campus',
  syncMetadata: 'collection, lastSyncTime',
  campuses: 'name',                           // mirrors CampusEntity (PK: name)
  departments: '++id, name, type, [name+type]' // mirrors DepartmentEntity (name + type)
});

db.version(5).stores({
  gatePasses: 'gatePassId, applyEmail, status, applyDate, lastUpdatedAt',
  interInstitutionalGatePasses: 'gatePassId, applyEmail, status, applyDate, destinationCampus, lastUpdatedAt',
  visitors: 'visitorId, applyEmail, status, meetDate, entryDate, lastUpdatedAt',
  users: 'email, role, department, campus, lastUpdatedAt',
  batches: 'id, department, campus',
  syncMetadata: 'collection, lastSyncTime',
  campuses: null,                               // drop the old campuses table
  campusData: '[name+type], name, type',        // create new one with compound PK
  departments: '++id, name, type, [name+type]'  // type: 'userManagement' | 'history' etc.
});
export const wipeDatabase = async () => {
  try {
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map(table => table.clear()));
    });
    console.log('Local database cleared successfully');
  } catch (error) {
    console.error('Failed to clear database:', error);
  }
};
