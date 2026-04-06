const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getAll } = require('../config/database');
const { success, error } = require('../utilities/responseHelper');

function createTecStackRoutes(db) {
  const router = express.Router();

  router.get('/', authenticate, async (req, res) => {
    try {
      const stacks = await getAll(db,
        `SELECT id, tec_stack_name, tec_stack_type, tec_stack_support
         FROM tec_stacks
         WHERE tec_stack_is_deleted = 0 OR tec_stack_is_deleted IS NULL
         ORDER BY tec_stack_type, tec_stack_name`
      );
      return success(res, stacks);
    } catch (err) {
      return error(res, 'Failed to get tec stacks');
    }
  });

  return router;
}

module.exports = createTecStackRoutes;
