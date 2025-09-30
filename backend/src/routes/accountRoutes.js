import { Router } from 'express';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { getMyAccount, updateMyAccount, changeMyPassword } from '../controllers/accountController.js';

const router = Router();

// Todas as rotas aqui requerem que o utilizador esteja autenticado
router.use(isAuthenticated);

router.get('/', getMyAccount);
router.put('/', updateMyAccount);
router.post('/change-password', changeMyPassword);

export default router;