import { Router } from 'express';
import { authorize, token, approve, userinfo } from '../controllers/oauthController.js';
import { verifyAccessToken } from '../middleware/authMiddleware.js'; // Importar

const router = Router();

// Onde a aplicação cliente redireciona o usuário para iniciar o fluxo
router.get('/authorize', authorize);

// Onde a aplicação cliente troca o código por um token
router.post('/token', token);

// Endpoint interno para o nosso frontend de consentimento
router.post('/approve', approve);

// Onde a aplicação cliente obtém informações do usuário
router.get('/userinfo', verifyAccessToken, userinfo);

export default router;