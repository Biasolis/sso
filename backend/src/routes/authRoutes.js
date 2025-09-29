import { Router } from 'express';
import { signup, login } from '../controllers/authController.js';

const router = Router();

// Rota para cadastro (signup)
router.post('/signup', signup);

// Rota para login
router.post('/login', login);

export default router;