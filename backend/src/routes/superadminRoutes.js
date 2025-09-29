import { Router } from 'express';
import {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getGroups,
    createGroup,
    deleteGroup,
    addUserToGroup,
    removeUserFromGroup,
    getGroupWithMembers,
    getUsersNotInGroup
} from '../controllers/superadminController.js';

const router = Router();

// User routes
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Group routes
router.get('/groups', getGroups);
router.post('/groups', createGroup);
router.delete('/groups/:id', deleteGroup);
router.get('/groups/:id/members', getGroupWithMembers);
router.get('/groups/:id/available-users', getUsersNotInGroup);

// User-group association routes
router.post('/groups/addUser', addUserToGroup);
router.delete('/groups/removeUser', removeUserFromGroup);


export default router;