import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { testConnection } from './database/db.js';
import authRoutes from './routes/authRoutes.js';
import superadminRoutes from './routes/superadminRoutes.js';

// Roda a função para testar a conexão antes de iniciar o servidor.
await testConnection();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rota de verificação
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'Servidor de Autenticação SSO está operacional.',
    database: 'connected',
  });
});

// Rota de Health Check
app.get('/health', async (req, res) => {
    try {
        await testConnection();
        res.status(200).json({ status: 'ok', database: 'connected' });
    } catch (error) {
        res.status(500).json({ status: 'error', database: 'disconnected' });
    }
});

// Usa as rotas de autenticação
app.use('/auth', authRoutes);

// Usa as rotas de superadmin
app.use('/superadmin', superadminRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor SSO rodando na porta ${PORT}`);
});