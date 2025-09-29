import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { testConnection } from './database/db.js';
import authRoutes from './routes/authRoutes.js'; // Importa as rotas

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

// Usa as rotas de autenticação
app.use('/auth', authRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor SSO rodando na porta ${PORT}`);
});