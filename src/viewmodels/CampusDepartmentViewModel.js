import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database/db';
import { CampusDepartmentRepository } from '../repositories/CampusDepartmentRepository';

const EMPTY_ARRAY = [];

// ── Reactive hooks (always in sync with local DB) ──────────────────────────

/** Live list of user-management campus names (admin sees all, others see own) */
export const useCampuses = (type = 'userManagement') =>
  useLiveQuery(async () => {
    const rows = await db.campusData.where('type').equals(type).toArray();
    return rows.map(r => r.name);
  }, [type]) || EMPTY_ARRAY;

/** Live list of departments for a given type (e.g. 'userManagement') */
export const useDepartments = (type = 'userManagement') =>
  useLiveQuery(async () => {
    const rows = await db.departments.where('type').equals(type).toArray();
    return rows.map(r => r.name);
  }, [type]) || EMPTY_ARRAY;

// ── Imperative fetch functions (mirrors Android UserOperationViewModel) ─────

/**
 * Fetch campuses for User Management / Batches / Add-User / Edit-User.
 * Cache-first — mirrors Android UserOperationRepository.getCampuses()
 * @param {string} token
 */
export const fetchCampuses = (token) =>
  CampusDepartmentRepository.getCampuses(token);

/**
 * Fetch campuses for Security Guard Allotment screen.
 * Uses a different API endpoint (/get-campus-for-allotment).
 * Admin gets all campuses; non-admin gets all MINUS their own campus.
 * Cache-first — mirrors Android BaseActivity.fetchAndShowCampusSelection()
 * @param {string} token
 */
export const fetchCampusesForAllotment = (token) =>
  CampusDepartmentRepository.getCampusesForAllotment(token);

/**
 * Fetch departments for a given context type.
 * Mirrors Android: userOperationViewModel.fetchDepartments(token, "userManagement")
 * @param {string} token
 * @param {string} type — 'userManagement' | 'history' | 'report'
 */
export const fetchDepartments = (token, type = 'userManagement') =>
  CampusDepartmentRepository.getDepartments(token, type);

/**
 * Fetch both campuses and departments in one call.
 * Mirrors Android: fetchCampuses() → on success → fetchDepartments()
 * @param {string} token
 * @param {string} deptType
 */
export const fetchCampusesAndDepartments = (token, deptType = 'userManagement') =>
  CampusDepartmentRepository.getCampusesAndDepartments(token, deptType);

/**
 * Force-clear local campus/department cache (called on logout).
 */
export const clearCampusDeptCache = () =>
  CampusDepartmentRepository.clearCache();
