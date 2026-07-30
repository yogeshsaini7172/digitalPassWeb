import { db } from '../database/db';
import { getCampusAndDepartment, getCampusForAllotment } from '../services/api';

/**
 * CampusDepartmentRepository
 *
 * Mirrors Android's UserOperationRepository.getCampuses() and getDepartments()
 *
 * Cache-first pattern (same as Android Room cache):
 *   1. Check local DB count for that type/key
 *   2. If count > 0 → return from IndexedDB (instant, offline-safe)
 *   3. If count == 0 → fetch from network, store in IndexedDB, return
 *
 * Cache keys (type column in departments table):
 *   'userManagement' → fetchDepartments(token, "userManagement")  — Add/Edit user
 *   'allotment'      → campuses for security guard allotment screen
 *
 * Campuses  → db.campusData (PK: name)           mirrors CampusEntity
 * Departments → db.departments (name + type)   mirrors DepartmentEntity
 */
export const CampusDepartmentRepository = {

  /**
   * Get campus list for user management (Add/Edit user, Batches).
   * Returns cached if available, fetches otherwise.
   * Mirrors: UserOperationRepository.getCampuses()
   * @param {string} token
   * @returns {Promise<string[]>}
   */
  getCampuses: async (token) => {
    const count = await db.campusData.where('type').equals('userManagement').count();
    if (count > 0) {
      const rows = await db.campusData.where('type').equals('userManagement').toArray();
      return rows.map(r => r.name);
    }
    const data = await getCampusAndDepartment(token);
    const campusList = data.campus || [];
    if (campusList.length > 0) {
      await db.campusData.bulkPut(campusList.map(name => ({ name, type: 'userManagement' })));
    }
    return campusList;
  },

  /**
   * Get campus list for Security Guard Allotment screen.
   * Different endpoint: /get-campus-for-allotment
   * Admin gets all campuses, non-admin gets all minus own campus.
   * @param {string} token
   * @returns {Promise<string[]>}
   */
  getCampusesForAllotment: async (token) => {
    const count = await db.campusData.where('type').equals('allotment').count();
    if (count > 0) {
      const rows = await db.campusData.where('type').equals('allotment').toArray();
      return rows.map(r => r.name);
    }
    const campusList = await getCampusForAllotment(token);
    const list = Array.isArray(campusList) ? campusList : [];
    if (list.length > 0) {
      await db.campusData.bulkPut(list.map(name => ({ name, type: 'allotment' })));
    }
    return list;
  },

  /**
   * Get departments by type. Returns cached if available, fetches otherwise.
   * Mirrors: UserOperationRepository.getDepartments(token, type)
   * @param {string} token
   * @param {string} type — 'userManagement' | 'history' | 'report' etc.
   * @returns {Promise<string[]>}
   */
  getDepartments: async (token, type = 'userManagement') => {
    const count = await db.departments.where('type').equals(type).count();
    if (count > 0) {
      const rows = await db.departments.where('type').equals(type).toArray();
      return rows.map(r => r.name);
    }
    const data = await getCampusAndDepartment(token);
    const deptList = data.department || [];
    if (deptList.length > 0) {
      await db.departments.bulkPut(deptList.map(name => ({ name, type })));
    }
    return deptList;
  },

  /**
   * Fetch both campuses and departments in one call, respecting cache.
   * Returns { campuses: string[], departments: string[] }
   * Mirrors: ManagementMember.showAllotmentDialog → fetchCampuses then fetchDepartments
   * @param {string} token
   * @param {string} deptType — matches Android's type parameter e.g. 'userManagement'
   */
  getCampusesAndDepartments: async (token, deptType = 'userManagement') => {
    const [campusCount, deptCount] = await Promise.all([
      db.campusData.where('type').equals('userManagement').count(),
      db.departments.where('type').equals(deptType).count(),
    ]);

    if (campusCount > 0 && deptCount > 0) {
      // Both cached — instant, no network call
      const [campusRows, deptRows] = await Promise.all([
        db.campusData.where('type').equals('userManagement').toArray(),
        db.departments.where('type').equals(deptType).toArray(),
      ]);
      return {
        campuses: campusRows.map(r => r.name),
        departments: deptRows.map(r => r.name),
      };
    }

    // Fetch from network once, cache both
    const data = await getCampusAndDepartment(token);
    const campusList = data.campus || [];
    const deptList = data.department || [];

    if (campusList.length > 0 && campusCount === 0) {
      await db.campusData.bulkPut(campusList.map(name => ({ name, type: 'userManagement' })));
    }
    if (deptList.length > 0 && deptCount === 0) {
      await db.departments.bulkPut(deptList.map(name => ({ name, type: deptType })));
    }

    return { campuses: campusList, departments: deptList };
  },

  /**
   * Clear all cached campus and department data.
   * Called on logout — mirrors Android wipeDatabase.
   */
  clearCache: async () => {
    await Promise.all([
      db.campusData.clear(),
      db.departments.clear(),
    ]);
  },
};
