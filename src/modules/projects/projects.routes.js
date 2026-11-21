const express = require('express');
const router  = express.Router();
const {
  getProjects, getProject, createProject, updateProject, deleteProject,
  getTasks, createTask, updateTask, deleteTask,
  getTeam, editUser, removeUser,
  getTimeline,
  createPhase, updatePhase, deletePhase,
  createMilestone, deleteMilestone,
} = require('./projects.controller');
const { protect, adminOnly } = require('../../middleware/auth');
const { tenancy } = require('../../middleware/tenancy');

router.use(protect, tenancy);

// Static sub-routes FIRST (before /:id to avoid conflict)
router.get('/tasks/list',       getTasks);
router.post('/tasks/create',    createTask);
router.put('/tasks/:id',        updateTask);
router.delete('/tasks/:id',     deleteTask);

router.get('/team/list',        getTeam);
router.put('/users/:id',        adminOnly, editUser);
router.delete('/users/:id',     adminOnly, removeUser);

router.get('/timeline/all',     getTimeline);

// Projects CRUD (dynamic :id routes AFTER)
router.get('/',        getProjects);
router.post('/',       createProject);
router.get('/:id',     getProject);
router.put('/:id',     updateProject);
router.delete('/:id',  deleteProject);

// Phases
router.post('/:id/phases',          createPhase);
router.put('/phases/:phaseId',      updatePhase);
router.delete('/phases/:phaseId',   deletePhase);

// Milestones
router.post('/:id/milestones',            createMilestone);
router.delete('/milestones/:milestoneId', deleteMilestone);

module.exports = router;
