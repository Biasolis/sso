import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { testConnection } from './database/db.js';
import authRoutes from './routes/authRoutes.js';
import superadminRoutes from './routes/superadminRoutes.js';
import oauthRoutes from './routes/oauthRoutes.js';
import accountRoutes from './routes/accountRoutes.js'; // Importar

// Executa a função para testar a conexão antes de iniciar o servidor.
await testConnection();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


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

// Utiliza as rotas de OAuth
app.use('/oauth', oauthRoutes);

// Utiliza as rotas de autenticação
app.use('/auth', authRoutes);

// Utiliza as rotas da conta do utilizador
app.use('/api/account', accountRoutes);

// Utiliza as rotas de superadmin
app.use('/superadmin', superadminRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor SSO a rodar na porta ${PORT}`);
});