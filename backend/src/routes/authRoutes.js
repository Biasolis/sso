import { Router } from 'express';
import { signup, login, forgotPassword, resetPassword, verifyEmail } from '../controllers/authController.js';

const router = Router();

// Rota para registo (signup)
router.post('/signup', signup);

// Rota para login
router.post('/login', login);

// Rotas para redefinição de palavra-passe
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Rota para verificação de e-mail
router.post('/verify-email', verifyEmail);

export default router;