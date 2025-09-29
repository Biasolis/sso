import { Router } from 'express';
import { isSuperadmin } from '../middleware/authMiddleware.js';
import {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    promoteUser,
    getGroups,
    createGroup,
    deleteGroup,
    addUserToGroup,
    removeUserFromGroup,
    getGroupWithMembers,
    getUsersNotInGroup,
    getClients,
    createClient,
    deleteClient
} from '../controllers/superadminController.js';

const router = Router();

// Aplica o middleware de superadmin a todas as rotas deste arquivo
router.use(isSuperadmin);

// User routes
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/promote', promoteUser);

// Group routes
router.get('/groups', getGroups);
router.post('/groups', createGroup);
router.delete('/groups/:id', deleteGroup);
router.get('/groups/:id/members', getGroupWithMembers);
router.get('/groups/:id/available-users', getUsersNotInGroup);

// User-group association routes
router.post('/groups/addUser', addUserToGroup);
router.delete('/groups/removeUser', removeUserFromGroup);

// Client routes
router.get('/clients', getClients);
router.post('/clients', createClient);
router.delete('/clients/:id', deleteClient);

export default router;