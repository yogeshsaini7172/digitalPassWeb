import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database/db';
import { GatePassRepository } from '../repositories/GatePassRepository';
import { InterInstitutionalGatePassRepository } from '../repositories/InterInstitutionalGatePassRepository';
import { VisitorRepository } from '../repositories/VisitorRepository';

const EMPTY_ARRAY = [];

// ── Helpers ──────────────────────────────────────────────────────────────────
const parseDateStr = (dStr) => {
  if (!dStr) return 0;
  let t = new Date(dStr).getTime();
  if (!isNaN(t)) return t;
  // Fallback for "YYYY-MM-DD hh:mm AM/PM"
  const match = dStr.match(/(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (match) {
    let [_, y, m, d, h, min, ampm] = match;
    h = parseInt(h, 10);
    if (ampm && ampm.toUpperCase() === 'PM' && h < 12) h += 12;
    if (ampm && ampm.toUpperCase() === 'AM' && h === 12) h = 0;
    return new Date(y, m - 1, d, h, min).getTime();
  }
  return 0;
};

const todayBounds = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  return {
    start: `${today} 00:00:00`,
    end:   `${today} 23:59:59`,
  };
};

// ── RAW hooks (all records, used by History range filter & MyGatePass) ────────
export const useGatePasses = () =>
  useLiveQuery(() => db.gatePasses.orderBy('applyDate').reverse().toArray(), []) || EMPTY_ARRAY;

export const useInterInstitutionalGatePasses = () =>
  useLiveQuery(() => db.interInstitutionalGatePasses.orderBy('applyDate').reverse().toArray(), []) || EMPTY_ARRAY;

export const useVisitors = () =>
  useLiveQuery(() => db.visitors.orderBy('meetDate').reverse().toArray(), []) || EMPTY_ARRAY;

// ── ACTIVE hooks (today, active statuses) — mirrors Android DAO exactly ──────

/**
 * Gate passes that are ACTIVE TODAY.
 * - Security guard: only 'approved'
 * - Others (non-student self excluded via applyEmail filter done in Dashboard):
 *   status IN ('pending','approving','approved') AND applyDate today
 *
 * Mirrors Android: GatePassDao.getActiveGatePassesByMember / getActiveGatePassesBySecurity
 */
export const useActiveGatePasses = () => {
  const { start, end } = todayBounds();
  const userRole  = (localStorage.getItem('userRole') || '').toLowerCase();
  const userEmail = (localStorage.getItem('userEmail') || '').toLowerCase();

  return useLiveQuery(async () => {
    if (userRole === 'security guard') {
      // Security: approved gate passes only, today
      return db.gatePasses
        .where('applyDate').between(start, end, true, true)
        .and(p => p.status === 'approved')
        .reverse()
        .sortBy('applyDate')
        .then(arr => arr.sort((a, b) => parseDateStr(b.applyDate) - parseDateStr(a.applyDate)));
    }
    // Others: pending/approving/approved today, exclude own applications (unless hod/principal)
    const activeStatuses = ['pending', 'approving', 'approved'];
    return db.gatePasses
      .where('applyDate').between(start, end, true, true)
      .and(p => {
        if (!activeStatuses.includes((p.status || '').toLowerCase())) return false;
        // HOD/Principal see all passes; others don't see their own applications in the list
        if (userRole === 'hod' || userRole === 'principal') return true;
        return (p.applyEmail || '').toLowerCase() !== userEmail;
      })
      .toArray()
      .then(arr => arr.sort((a, b) => parseDateStr(b.applyDate) - parseDateStr(a.applyDate)));
  }, [userRole, userEmail, start, end]) || EMPTY_ARRAY;
};

/** Inter-institutional active (mirrors Android InterInstitutionalGatePassDao.kt) */
export const useActiveInterInstitutionalGatePasses = () => {
  const { start, end } = todayBounds();
  const userRole  = (localStorage.getItem('userRole') || '').toLowerCase();
  const userEmail = (localStorage.getItem('userEmail') || '').toLowerCase();

  return useLiveQuery(async () => {
    if (userRole === 'security guard') {
      // Security: NOT IN ('pending','approving','rejected') AND passActivity = 'active', today
      return db.interInstitutionalGatePasses
        .where('applyDate').between(start, end, true, true)
        .and(p => {
          const s = (p.status || '').toLowerCase();
          if (['pending', 'approving', 'rejected'].includes(s)) return false;
          return (p.passActivity || '').toLowerCase() === 'active';
        })
        .toArray()
        .then(arr => arr.sort((a, b) => parseDateStr(b.applyDate) - parseDateStr(a.applyDate)));
    }
    // Others: NOT IN ('Re-entered into source campus'), today
    return db.interInstitutionalGatePasses
      .where('applyDate').between(start, end, true, true)
      .and(p => {
        if ((p.status || '') === 'Re-entered into source campus') return false;
        if (userRole === 'hod' || userRole === 'principal') return true;
        return (p.applyEmail || '').toLowerCase() !== userEmail;
      })
      .toArray()
      .then(arr => arr.sort((a, b) => parseDateStr(b.applyDate) - parseDateStr(a.applyDate)));
  }, [userRole, userEmail, start, end]) || EMPTY_ARRAY;
};

/**
 * Gate passes that are HISTORICAL (past or completed).
 * Mirrors Android: GatePassDao.getHistoricalGatePasses
 * Condition: applyDate < todayStart  OR  status NOT IN ('pending','approving','approved')
 */
export const useHistoricalGatePasses = () => {
  const { start } = todayBounds();
  return useLiveQuery(async () => {
    const activeStatuses = ['pending', 'approving', 'approved'];
    return db.gatePasses
      .filter(p =>
        (p.applyDate || '') < start ||
        !activeStatuses.includes((p.status || '').toLowerCase())
      )
      .toArray()
      .then(arr => arr.sort((a, b) => parseDateStr(b.applyDate) - parseDateStr(a.applyDate)));
  }, [start]) || EMPTY_ARRAY;
};

export const useHistoricalInterInstitutionalGatePasses = () => {
  const { start } = todayBounds();
  return useLiveQuery(async () => {
    const activeStatuses = ['pending', 'approving', 'approved'];
    return db.interInstitutionalGatePasses
      .filter(p =>
        (p.applyDate || '') < start ||
        !activeStatuses.includes((p.status || '').toLowerCase())
      )
      .toArray()
      .then(arr => arr.sort((a, b) => parseDateStr(b.applyDate) - parseDateStr(a.applyDate)));
  }, [start]) || EMPTY_ARRAY;
};

/**
 * Visitors that are ACTIVE TODAY.
 * Mirrors Android: VisitorDao.getActiveVisitors
 * status IN ('pending','meet') AND entryDate today
 */
export const useActiveVisitors = () => {
  const { start, end } = todayBounds();
  return useLiveQuery(async () => {
    const activeStatuses = ['pending', 'meet'];
    // Use meetDate as the date field (Android uses entryDate but web stores meetDate)
    return db.visitors
      .filter(v => {
        const dateField = (v.entryDate || v.meetDate || '');
        return dateField >= start && dateField <= end &&
               activeStatuses.includes((v.status || '').toLowerCase());
      })
      .toArray()
      .then(arr => arr.sort((a, b) =>
        parseDateStr(b.entryDate || b.meetDate) - parseDateStr(a.entryDate || a.meetDate)
      ));
  }, [start, end]) || EMPTY_ARRAY;
};

/**
 * Visitors that are HISTORICAL.
 * Mirrors Android: VisitorDao.getHistoricalVisitors
 * entryDate < todayStart OR status NOT IN ('pending','meet')
 */
export const useHistoricalVisitors = () => {
  const { start } = todayBounds();
  return useLiveQuery(async () => {
    const activeStatuses = ['pending', 'meet'];
    return db.visitors
      .filter(v => {
        const dateField = (v.entryDate || v.meetDate || '');
        return dateField < start || !activeStatuses.includes((v.status || '').toLowerCase());
      })
      .toArray()
      .then(arr => arr.sort((a, b) =>
        parseDateStr(b.entryDate || b.meetDate) - parseDateStr(a.entryDate || a.meetDate)
      ));
  }, [start]) || EMPTY_ARRAY;
};

// ── Sync triggers (fire-and-forget — no await needed by callers) ──────────────
export const triggerGatePassSync = (token) =>
  GatePassRepository.syncGatePasses(token);

export const triggerInterInstitutionalGatePassSync = (token) =>
  InterInstitutionalGatePassRepository.syncInterInstitutionalGatePasses(token);

export const triggerVisitorSync = (token) =>
  VisitorRepository.syncVisitors(token);

export const triggerAllPassSync = (token) =>
  Promise.all([
    triggerGatePassSync(token),
    triggerInterInstitutionalGatePassSync(token),
    triggerVisitorSync(token),
  ]);
