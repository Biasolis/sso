import jwt from 'jsonwebtoken';
import pool from '../database/db.js';

export const isSuperadmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
  }
  
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    
    const { rows } = await pool.query('SELECT is_superadmin FROM users WHERE id = $1', [userId]);
    const user = rows[0];

    if (!user || !user.is_superadmin) {
        return res.status(403).json({ message: 'Acesso negado. Requer privilégios de superadmin.' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido.' });
  }
};

// NOVO MIDDLEWARE
export const verifyAccessToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'invalid_token', error_description: 'Nenhum token fornecido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verifica se o token é um JWT válido assinado pelo nosso segredo
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // O 'subject' do nosso access token é o ID do usuário
    req.userId = decoded.sub;
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'invalid_token', error_description: 'O access token é inválido ou expirou.' });
  }
};