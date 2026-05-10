const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getAll } = require('../config/database');
const { success, error } = require('../utilities/responseHelper');

function createGraphRoutes(db) {
  const router = express.Router();

  router.get('/', authenticate, async (req, res) => {
    try {
      const nodes = [];
      const links = [];
      const nodeSet = new Set();

      const addNode = (id, type, label, meta = {}) => {
        if (!nodeSet.has(id)) {
          nodeSet.add(id);
          nodes.push({ id, type, label, ...meta });
        }
      };

      const addLink = (source, target, type) => {
        if (nodeSet.has(source) && nodeSet.has(target)) {
          links.push({ source, target, type });
        }
      };

      const [projects, divisions, initiatives, vendors, users,
             projCountries, projDivisions, projAssignments, notes, noteEntities] = await Promise.all([
        getAll(db, `SELECT p.id, p.project_name, p.division_id, p.initiative_id, p.user_id
                    FROM projects p
                    WHERE p.project_is_deleted=0 OR p.project_is_deleted IS NULL`, []),
        getAll(db, `SELECT id, division_name FROM divisions WHERE division_is_deleted=0 OR division_is_deleted IS NULL`, []),
        getAll(db, `SELECT id, initiative_name FROM initiatives WHERE initiative_is_deleted=0 OR initiative_is_deleted IS NULL`, []),
        getAll(db, `SELECT id, vendor_name FROM vendors WHERE vendor_is_deleted=0 OR vendor_is_deleted IS NULL`, []),
        getAll(db, `SELECT DISTINCT u.id, TRIM(u.user_name||' '||COALESCE(u.user_lastname,'')) as name
                    FROM users u
                    WHERE u.user_is_deleted=0 OR u.user_is_deleted IS NULL`, []),
        getAll(db, `SELECT pc.project_id, pc.UN_country_code, c.short_name
                    FROM projects_to_countries pc
                    JOIN countries c ON pc.UN_country_code = c.UN_country_code`, []),
        getAll(db, `SELECT project_id, division_id FROM projects_to_divisions`, []),
        getAll(db, `SELECT DISTINCT pa.project_id, pa.user_id
                    FROM project_assignments pa`, []),
        getAll(db, `SELECT id, note_title, note_type FROM meeting_notes WHERE note_is_deleted=0 OR note_is_deleted IS NULL`, []),
        getAll(db, `SELECT note_id, entity_type, entity_id FROM meeting_note_entities`, []),
      ]);

      // Core entity nodes
      divisions.forEach(d => addNode(`div-${d.id}`, 'division', d.division_name, { entityId: d.id }));
      initiatives.forEach(i => addNode(`ini-${i.id}`, 'initiative', i.initiative_name, { entityId: i.id }));
      vendors.forEach(v => addNode(`ven-${v.id}`, 'vendor', v.vendor_name, { entityId: v.id }));
      users.forEach(u => addNode(`usr-${u.id}`, 'user', u.name.trim(), { entityId: u.id }));
      notes.forEach(n => addNode(`note-${n.id}`, 'note', n.note_title, { entityId: n.id, noteType: n.note_type }));

      // Countries: only those linked to projects
      const linkedCountries = new Map();
      projCountries.forEach(pc => linkedCountries.set(pc.UN_country_code, pc.short_name));
      linkedCountries.forEach((name, code) => addNode(`cty-${code}`, 'country', name, { entityId: code }));

      // Projects
      projects.forEach(p => addNode(`prj-${p.id}`, 'project', p.project_name, { entityId: p.id }));

      // Project → Division
      projects.forEach(p => {
        if (p.division_id) addLink(`prj-${p.id}`, `div-${p.division_id}`, 'division');
      });

      // Project → Initiative
      projects.forEach(p => {
        if (p.initiative_id) addLink(`prj-${p.id}`, `ini-${p.initiative_id}`, 'initiative');
      });

      // Project → Owner (user)
      projects.forEach(p => {
        if (p.user_id) addLink(`prj-${p.id}`, `usr-${p.user_id}`, 'owner');
      });

      // Project → Country
      projCountries.forEach(pc => addLink(`prj-${pc.project_id}`, `cty-${pc.UN_country_code}`, 'country'));

      // Project → Supporting Division
      projDivisions.forEach(pd => addLink(`prj-${pd.project_id}`, `div-${pd.division_id}`, 'supporting'));

      // Project → Assigned users
      projAssignments.forEach(pa => addLink(`prj-${pa.project_id}`, `usr-${pa.user_id}`, 'role'));

      // Note → Entity
      noteEntities.forEach(ne => {
        const prefixMap = { project: 'prj', division: 'div', initiative: 'ini', vendor: 'ven', user: 'usr', country: 'cty' };
        const prefix = prefixMap[ne.entity_type];
        if (prefix) addLink(`note-${ne.note_id}`, `${prefix}-${ne.entity_id}`, 'mention');
      });

      return success(res, { nodes, links });
    } catch (err) {
      return error(res, 'Failed to build graph');
    }
  });

  return router;
}

module.exports = createGraphRoutes;
