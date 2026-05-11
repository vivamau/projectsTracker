const express = require('express');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const { authenticate, authorize } = require('../middleware/auth');
const consumptionReportService = require('../services/consumptionReportService');
const { success, error } = require('../utilities/responseHelper');
const { auditLog } = require('../utilities/auditHelper');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Only PDF files are allowed'));
  }
});

function createConsumptionReportRoutes(db, auditDb) {
  const router = express.Router({ mergeParams: true });

  router.post('/parse', authenticate, authorize('superadmin', 'admin'), upload.single('report'), async (req, res) => {
    if (!req.file) return error(res, 'A PDF report file is required', 400);

    try {
      const parser = new PDFParse({ data: req.file.buffer });
      const { text } = await parser.getText();
      await parser.destroy();
      const parsed = consumptionReportService.parseReportText(text);

      const matchedPO = await consumptionReportService.findMatchingPO(db, parsed.poNumber);
      const items = matchedPO
        ? await consumptionReportService.getItemsForPO(db, matchedPO.id)
        : [];

      const { matches, unmatched } = consumptionReportService.matchResourcesToItems(items, parsed.resources);

      const suggestions = matches.map(({ item, resource }) => ({
        purchaseorderitem_id: item.id,
        resource_name: resource.fullName,
        role: resource.role,
        consumption_days: resource.daysConsumed ?? parsed.daysConsumed,
        consumption_month: parsed.periodEpoch,
        consumption_comment: `${parsed.periodStr || 'Consumption report'} - imported from report`
      }));

      return success(res, { parsed, matchedPO, items, suggestions, unmatched });
    } catch (err) {
      if (err.message === 'Only PDF files are allowed') return error(res, err.message, 400);
      return error(res, 'Failed to parse the report');
    }
  });

  router.post('/apply', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      return error(res, 'entries array is required and must not be empty', 400);
    }

    for (const e of entries) {
      if (!e.purchaseorderitem_id || e.consumption_days === undefined || e.consumption_days === null || !e.consumption_month) {
        return error(res, 'Each entry requires purchaseorderitem_id, consumption_days, and consumption_month', 400);
      }
    }

    try {
      const results = await consumptionReportService.applyReport(db, entries, req.user.id);

      await auditLog(auditDb, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'consumption_report.apply',
        entityType: 'consumption',
        entityId: req.params.id,
        details: { entries_count: entries.length, project_id: req.params.id },
        ip: req.ip
      });

      return success(res, { created: results.length }, 201);
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return error(res, 'A consumption entry already exists for one of the selected months', 409);
      }
      return error(res, 'Failed to apply the consumption report');
    }
  });

  return router;
}

module.exports = createConsumptionReportRoutes;
