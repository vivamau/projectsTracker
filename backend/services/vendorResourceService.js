const { getOne, getAll } = require('../config/database');

async function getById(db, id) {
  const result = await getOne(db,
    `SELECT * FROM vendorresources WHERE id = ?`,
    [id]
  );
  return result || null;
}

async function getProjects(db, resourceId) {
  return getAll(db,
    `SELECT DISTINCT p.id as project_id, p.project_name, p.project_description,
            p.project_start_date, p.project_end_date,
            d.division_name,
            po.purchaseorder_description as po_description,
            COUNT(poi.id) as item_count
     FROM purchaseorderitems poi
     JOIN purchaseorders po ON poi.purchaseorder_id = po.id
     JOIN budgets b ON po.budget_id = b.id
     JOIN projects_to_budgets ptb ON b.id = ptb.budget_id
     JOIN projects p ON ptb.project_id = p.id
     LEFT JOIN divisions d ON p.division_id = d.id
     WHERE poi.vendorresource_id = ?
       AND (poi.purchaseorderitem_is_deleted = 0 OR poi.purchaseorderitem_is_deleted IS NULL)
       AND (po.purchaseorder_is_deleted = 0 OR po.purchaseorder_is_deleted IS NULL)
       AND (p.project_is_deleted = 0 OR p.project_is_deleted IS NULL)
     GROUP BY p.id
     ORDER BY p.project_start_date DESC`,
    [resourceId]
  );
}

async function getByProjectId(db, projectId) {
  return getAll(db,
    `SELECT
       vr.id as vendorresource_id,
       vr.vendorresource_name,
       vr.vendorresource_lastname,
       vr.vendorresource_middlename,
       vr.vendorresource_email,
       vr.vendorresource_phone,
       v.id as vendor_id,
       v.vendor_name,
       vcr.id as vendorcontractrole_id,
       vcr.vendorcontractrole_name
    FROM vendorresources vr
    JOIN vendors v ON vr.vendor_id = v.id
    LEFT JOIN vendorcontractroles vcr ON vcr.id = (
      SELECT poi2.vendorcontractrole_id
      FROM purchaseorderitems poi2
      JOIN purchaseorders po2 ON poi2.purchaseorder_id = po2.id
      JOIN budgets b2 ON po2.budget_id = b2.id
      JOIN projects_to_budgets ptb2 ON b2.id = ptb2.budget_id
      WHERE ptb2.project_id = ?
        AND poi2.vendorresource_id = vr.id
        AND poi2.vendorcontractrole_id IS NOT NULL
        AND (poi2.purchaseorderitem_is_deleted = 0 OR poi2.purchaseorderitem_is_deleted IS NULL)
        AND (po2.purchaseorder_is_deleted = 0 OR po2.purchaseorder_is_deleted IS NULL)
        AND (b2.budget_is_deleted = 0 OR b2.budget_is_deleted IS NULL)
      ORDER BY poi2.purchaseorderitem_create_date DESC
      LIMIT 1
    )
    WHERE vr.id IN (
      SELECT DISTINCT poi.vendorresource_id
      FROM purchaseorderitems poi
      JOIN purchaseorders po ON poi.purchaseorder_id = po.id
      JOIN budgets b ON po.budget_id = b.id
      JOIN projects_to_budgets ptb ON b.id = ptb.budget_id
      WHERE ptb.project_id = ?
        AND poi.vendorresource_id IS NOT NULL
        AND (poi.purchaseorderitem_is_deleted = 0 OR poi.purchaseorderitem_is_deleted IS NULL)
        AND (po.purchaseorder_is_deleted = 0 OR po.purchaseorder_is_deleted IS NULL)
        AND (b.budget_is_deleted = 0 OR b.budget_is_deleted IS NULL)
    )
    ORDER BY v.vendor_name, vr.vendorresource_lastname, vr.vendorresource_name`,
    [projectId, projectId]
  );
}

module.exports = { getById, getProjects, getByProjectId };
