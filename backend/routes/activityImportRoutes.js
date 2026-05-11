const express = require('express');
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const activityImportService = require('../services/activityImportService');
const { success, error } = require('../utilities/responseHelper');
const { auditLog } = require('../utilities/auditHelper');

const XLSX_EXTENSIONS = ['xlsx', 'xls'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (XLSX_EXTENSIONS.includes(ext)) return cb(null, true);
    cb(new Error('Only Excel files (.xlsx / .xls) are allowed'));
  }
});

function createActivityImportRoutes(db, auditDb) {
  const router = express.Router();

  // Debug-only: returns raw parsed rows without inserting
  router.post('/import-activities/preview', authenticate, authorize('superadmin'), (req, res) => {
    upload.single('file')(req, res, async (uploadErr) => {
      if (uploadErr) return error(res, uploadErr.message || 'File upload error', 400);
      if (!req.file) return error(res, 'An Excel file is required', 400);
      try {
        const rows = await activityImportService.parseXlsxBuffer(req.file.buffer);
        return success(res, { count: rows.length, sample: rows.slice(0, 3) });
      } catch (err) {
        return error(res, `Parse failed: ${err.message}`, 500);
      }
    });
  });

  router.post('/import-activities', authenticate, authorize('superadmin'), (req, res) => {
    upload.single('file')(req, res, async (uploadErr) => {
      if (uploadErr) return error(res, uploadErr.message || 'File upload error', 400);
      if (!req.file) return error(res, 'An Excel file is required', 400);

      try {
        const reset = req.query.reset === 'true';
        const result = await activityImportService.importActivities(db, req.file.buffer, { reset });

        await auditLog(auditDb, {
          userId: req.user.id,
          userEmail: req.user.email,
          action: 'activities.import',
          entityType: 'activity',
          entityId: null,
          details: { inserted: result.inserted, skipped: result.skipped, unmatched: result.unmatched.length },
          ip: req.ip
        });

        return success(res, result);
      } catch (err) {
        console.error('[activity-import]', err);
        return error(res, `Import failed: ${err.message}`, 500);
      }
    });
  });

  return router;
}

module.exports = createActivityImportRoutes;
