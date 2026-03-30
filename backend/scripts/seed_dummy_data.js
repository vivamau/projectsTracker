const { getAll, getOne, runQuery } = require('../config/database');

const DIVISIONS = [
  'Engineering',
  'Product Management',
  'Human Resources',
  'Finance & Accounting',
  'Marketing',
  'Sales',
  'Customer Support',
  'Legal & Compliance',
  'Operations',
  'Research & Development',
  'Quality Assurance',
  'Data & Analytics',
  'Information Technology',
  'Design & UX',
  'Supply Chain'
];

const INITIATIVES = [
  { name: 'Digital Transformation', description: 'Modernize legacy systems and adopt cloud-native solutions' },
  { name: 'Customer Experience', description: 'Improve end-to-end customer journey and satisfaction scores' },
  { name: 'Cost Optimization', description: 'Reduce operational costs through process automation' },
  { name: 'Market Expansion', description: 'Enter new geographic markets and customer segments' },
  { name: 'Talent Development', description: 'Upskill workforce and improve retention rates' },
  { name: 'Sustainability', description: 'Reduce environmental impact and meet ESG targets' },
  { name: 'Data-Driven Decisions', description: 'Build analytics capabilities across the organization' },
  { name: 'Security & Compliance', description: 'Strengthen cybersecurity posture and regulatory compliance' }
];

const DELIVERY_PATHS = [
  { name: 'Agile', description: 'Iterative sprints with continuous delivery' },
  { name: 'Waterfall', description: 'Sequential phase-gate delivery model' },
  { name: 'Hybrid', description: 'Combined agile and waterfall approach' },
  { name: 'Kanban', description: 'Continuous flow with WIP limits' },
  { name: 'SAFe', description: 'Scaled Agile Framework for enterprise delivery' }
];

const PROJECTS = [
  { name: 'Cloud Migration Phase 1', description: 'Migrate on-premise infrastructure to AWS', health: 3 },
  { name: 'Mobile App Redesign', description: 'Redesign the customer-facing mobile application', health: 3 },
  { name: 'ERP System Upgrade', description: 'Upgrade SAP ERP to S/4HANA', health: 2 },
  { name: 'Customer Portal v2', description: 'Build new self-service customer portal', health: 3 },
  { name: 'Data Warehouse Modernization', description: 'Replace legacy DW with Snowflake', health: 1 },
  { name: 'HR Onboarding Automation', description: 'Automate employee onboarding workflows', health: 3 },
  { name: 'Payment Gateway Integration', description: 'Integrate Stripe and PayPal payment gateways', health: 2 },
  { name: 'Cybersecurity Audit', description: 'Conduct comprehensive security assessment', health: 3 },
  { name: 'Brand Refresh Campaign', description: 'Update brand identity across all channels', health: 3 },
  { name: 'Supply Chain Optimization', description: 'Implement AI-driven supply chain forecasting', health: 2 },
  { name: 'Internal Knowledge Base', description: 'Build a centralized knowledge management platform', health: 3 },
  { name: 'API Gateway Rollout', description: 'Deploy centralized API management layer', health: 1 },
  { name: 'Compliance Dashboard', description: 'Real-time regulatory compliance monitoring', health: 3 },
  { name: 'Sales CRM Migration', description: 'Migrate from legacy CRM to Salesforce', health: 2 },
  { name: 'Automated Testing Framework', description: 'Implement CI/CD with automated test suites', health: 3 },
  { name: 'Office 365 Rollout', description: 'Enterprise-wide Office 365 migration', health: 3 },
  { name: 'Customer Analytics Platform', description: 'Build unified customer analytics and segmentation', health: 2 },
  { name: 'Disaster Recovery Plan', description: 'Design and test business continuity strategy', health: 1 },
  { name: 'Vendor Management System', description: 'Centralize vendor onboarding and performance tracking', health: 3 },
  { name: 'Employee Wellness Program', description: 'Launch digital wellness and benefits platform', health: 3 }
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY'];

const MILESTONES = [
  { value: 0, comment: 'Project initiated' },
  { value: 10, comment: 'Requirements gathering started' },
  { value: 20, comment: 'Requirements finalized' },
  { value: 30, comment: 'Design phase complete' },
  { value: 40, comment: 'Development started' },
  { value: 50, comment: 'Core features implemented' },
  { value: 60, comment: 'Integration testing in progress' },
  { value: 70, comment: 'UAT phase started' },
  { value: 80, comment: 'UAT complete, bug fixes in progress' },
  { value: 90, comment: 'Final review and sign-off' },
  { value: 100, comment: 'Project delivered' }
];

const HEALTH_COMMENTS = {
  3: ['On track, no blockers', 'Progressing well', 'All milestones met', 'Team performing strongly'],
  2: ['Minor delays, being addressed', 'Some risks identified', 'Resource constraints noted', 'Dependency waiting'],
  1: ['Critical blocker identified', 'Significant schedule risk', 'Budget overrun likely', 'Requires escalation']
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function daysAgo(days) {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

async function seedDummyData(db) {
  // Check if dummy data already exists (need both divisions and projects)
  const existingProjectCount = await getOne(db, 'SELECT COUNT(*) as c FROM projects WHERE project_is_deleted = 0 OR project_is_deleted IS NULL');
  const existingDivisionCount = await getOne(db, 'SELECT COUNT(*) as c FROM divisions WHERE division_is_deleted = 0 OR division_is_deleted IS NULL');
  if (existingDivisionCount.c >= 5 && existingProjectCount.c >= 10) {
    console.log('  Dummy data already seeded, skipping.');
    return;
  }

  const now = Date.now();

  // --- Divisions ---
  const divisionIds = [];
  for (const name of DIVISIONS) {
    const existing = await getOne(db, 'SELECT id FROM divisions WHERE division_name = ?', [name]);
    if (existing) {
      divisionIds.push(existing.id);
      continue;
    }
    const result = await runQuery(db,
      'INSERT INTO divisions (division_name, division_create_date, division_update_date) VALUES (?, ?, ?)',
      [name, daysAgo(randomInt(60, 365)), now]
    );
    divisionIds.push(result.lastID);
  }
  console.log(`  Seeded ${DIVISIONS.length} divisions.`);

  // --- Initiatives ---
  const initiativeIds = [];
  for (const init of INITIATIVES) {
    const existing = await getOne(db, 'SELECT id FROM initiatives WHERE initiative_name = ?', [init.name]);
    if (existing) {
      initiativeIds.push(existing.id);
      continue;
    }
    const result = await runQuery(db,
      'INSERT INTO initiatives (initiative_name, initiative_description, initiative_create_date, initiative_update_date) VALUES (?, ?, ?, ?)',
      [init.name, init.description, daysAgo(randomInt(30, 180)), now]
    );
    initiativeIds.push(result.lastID);
  }
  console.log(`  Seeded ${INITIATIVES.length} initiatives.`);

  // --- Delivery Paths ---
  const deliveryPathIds = [];
  for (const dp of DELIVERY_PATHS) {
    const existing = await getOne(db, 'SELECT id FROM deliverypaths WHERE deliverypath_name = ?', [dp.name]);
    if (existing) {
      deliveryPathIds.push(existing.id);
      continue;
    }
    const result = await runQuery(db,
      'INSERT INTO deliverypaths (deliverypath_name, deilverypath_description, deliverypath_create_date, deliverypath_update_date) VALUES (?, ?, ?, ?)',
      [dp.name, dp.description, daysAgo(randomInt(30, 180)), now]
    );
    deliveryPathIds.push(result.lastID);
  }
  console.log(`  Seeded ${DELIVERY_PATHS.length} delivery paths.`);

  // --- Currencies ---
  const currencyIds = [];
  for (const name of CURRENCIES) {
    const existing = await getOne(db, 'SELECT id FROM currencies WHERE currency_name = ?', [name]);
    if (existing) {
      currencyIds.push(existing.id);
      continue;
    }
    const result = await runQuery(db,
      'INSERT INTO currencies (currency_name, currency_create_date) VALUES (?, ?)',
      [name, now]
    );
    currencyIds.push(result.lastID);
  }
  console.log(`  Seeded ${CURRENCIES.length} currencies.`);

  // --- Get an admin user for project ownership ---
  const adminUser = await getOne(db, "SELECT id FROM users WHERE user_email = 'admin@projecttracker.it'");
  const ownerId = adminUser ? adminUser.id : null;

  // --- Get some country codes for linking ---
  const countries = await getAll(db, 'SELECT UN_country_code FROM countries LIMIT 30');
  const countryCodes = countries.map(c => c.UN_country_code);

  // --- Projects ---
  for (const proj of PROJECTS) {
    const planDate = daysAgo(randomInt(30, 120));
    const startDate = planDate + randomInt(7, 30) * 24 * 60 * 60 * 1000;
    const endDate = startDate + randomInt(60, 240) * 24 * 60 * 60 * 1000;

    const divisionId = pick(divisionIds);
    const initiativeId = pick(initiativeIds);
    const deliveryPathId = pick(deliveryPathIds);

    const result = await runQuery(db,
      `INSERT INTO projects (project_name, project_description, project_plan_date, project_start_date, project_end_date,
        project_create_date, project_update_date, division_id, user_id, initiative_id, deliverypath_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [proj.name, proj.description, planDate, startDate, endDate,
        daysAgo(randomInt(7, 90)), now, divisionId, ownerId, initiativeId, deliveryPathId]
    );
    const projectId = result.lastID;

    // Link 1-4 random countries
    const numCountries = randomInt(1, 4);
    const usedCodes = new Set();
    for (let i = 0; i < numCountries && countryCodes.length > 0; i++) {
      const code = pick(countryCodes);
      if (usedCodes.has(code)) continue;
      usedCodes.add(code);
      await runQuery(db,
        'INSERT INTO projects_to_countries (project_id, UN_country_code) VALUES (?, ?)',
        [projectId, code]
      );
    }

    // Add 1-3 health statuses over time
    const numStatuses = randomInt(1, 3);
    for (let i = 0; i < numStatuses; i++) {
      const statusDate = daysAgo(randomInt(0, 60));
      // Last status matches the project's defined health
      const healthValue = (i === numStatuses - 1) ? proj.health : randomInt(1, 3);
      const comment = pick(HEALTH_COMMENTS[healthValue]);
      await runQuery(db,
        'INSERT INTO healthstatuses (healthstatus_value, healthstatus_comment, healthstatus_create_date, project_id) VALUES (?, ?, ?, ?)',
        [healthValue, comment, statusDate, projectId]
      );
    }

    // Add completion milestones - pick a random completion % and add milestones up to it
    const targetCompletion = pick([20, 30, 40, 50, 60, 70, 80, 90, 100]);
    const relevantMilestones = MILESTONES.filter(m => m.value <= targetCompletion);
    for (let i = 0; i < relevantMilestones.length; i++) {
      const ms = relevantMilestones[i];
      const msDate = daysAgo(targetCompletion === 100 ? randomInt(0, 10) : (relevantMilestones.length - i) * randomInt(3, 10));
      await runQuery(db,
        'INSERT INTO completions (completion_value, completion_comment, completion_create_date, completion_update_date, project_id, user_id) VALUES (?, ?, ?, ?, ?, ?)',
        [ms.value, ms.comment, msDate, msDate, projectId, ownerId]
      );
    }

    // Assign 1-2 project managers from existing users
    const numPMs = randomInt(1, 2);
    const usedPMUsers = new Set();
    for (let i = 0; i < numPMs; i++) {
      const pmUserId = randomInt(1, 4);
      if (usedPMUsers.has(pmUserId)) continue;
      usedPMUsers.add(pmUserId);
      // Find or create projectmanager record
      const existing = await getOne(db, 'SELECT id FROM projectmanagers WHERE user_id = ?', [pmUserId]);
      let pmId;
      if (existing) {
        pmId = existing.id;
      } else {
        const pmResult = await runQuery(db,
          'INSERT INTO projectmanagers (user_id, division_id) VALUES (?, ?)',
          [pmUserId, divisionId]
        );
        pmId = pmResult.lastID;
      }
      await runQuery(db,
        'INSERT INTO projects_to_projectmanagers (project_id, projectmanager_id, division_id, project_to_projectmanager_create_date, project_to_projectmanager_start_date) VALUES (?, ?, ?, ?, ?)',
        [projectId, pmId, divisionId, daysAgo(randomInt(7, 60)), daysAgo(randomInt(0, 30))]
      );
    }

    // Add 1-2 budgets per project
    const numBudgets = randomInt(1, 2);
    for (let i = 0; i < numBudgets; i++) {
      const amount = randomInt(5, 500) * 1000;
      const cId = pick(currencyIds);
      const bStart = daysAgo(randomInt(30, 180));
      const bEnd = bStart + randomInt(90, 365) * 24 * 60 * 60 * 1000;
      const budgetResult = await runQuery(db,
        'INSERT INTO budgets (budget_amount, currency_id, budget_start_date, budget_end_date, budget_create_date, budget_update_date) VALUES (?, ?, ?, ?, ?, ?)',
        [amount, cId, bStart, bEnd, daysAgo(randomInt(7, 60)), now]
      );
      await runQuery(db,
        'INSERT INTO projects_to_budgets (project_id, budget_id) VALUES (?, ?)',
        [projectId, budgetResult.lastID]
      );
    }
  }
  console.log(`  Seeded ${PROJECTS.length} projects with health statuses, completions, budgets, and country links.`);

  // --- Focal Points (1-2 per division) ---
  const existingFPs = await getOne(db, 'SELECT COUNT(*) as c FROM focalpoints');
  if (existingFPs.c === 0) {
    for (const divId of divisionIds) {
      const numFPs = randomInt(1, 2);
      const usedUsers = new Set();
      for (let i = 0; i < numFPs; i++) {
        const userId = randomInt(1, 4);
        if (usedUsers.has(userId)) continue;
        usedUsers.add(userId);
        await runQuery(db,
          'INSERT INTO focalpoints (division_id, user_id) VALUES (?, ?)',
          [divId, userId]
        );
      }
    }
    console.log('  Seeded focal points for divisions.');
  }
}

module.exports = { seedDummyData };
