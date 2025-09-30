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
    deleteClient,
    getClientPermissions,
    addClientPermission,
    removeClientPermission
} from '../controllers/superadminController.js';

const router = Router();

// Aplica o middleware de superadmin a todas as rotas deste ficheiro
router.use(isSuperadmin);

// Rotas de Utilizadores
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/promote', promoteUser);

// Rotas de Grupos
router.get('/groups', getGroups);
router.post('/groups', createGroup);
router.delete('/groups/:id', deleteGroup);
router.get('/groups/:id/members', getGroupWithMembers);
router.get('/groups/:id/available-users', getUsersNotInGroup);

// Rotas de Associação Utilizador-Grupo
router.post('/groups/addUser', addUserToGroup);
router.delete('/groups/removeUser', removeUserFromGroup);

// Rotas de Clientes
router.get('/clients', getClients);
router.post('/clients', createClient);
router.delete('/clients/:id', deleteClient);

// Rotas de Permissões de Clientes (NOVO)
router.get('/clients/:id/permissions', getClientPermissions);
router.post('/clients/:id/permissions', addClientPermission);
router.delete('/clients/:id/permissions', removeClientPermission);

export default router;