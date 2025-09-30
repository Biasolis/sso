import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../database/db.js';
import { authenticateLDAP } from '../services/ldapService.js';
import crypto from 'crypto';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/mailService.js';

// Função para registar um novo utilizador
export const signup = async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email e palavra-passe são obrigatórios.' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUserResult = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, password_hash, name]
    );
    const newUser = newUserResult.rows[0];

    // Gera e envia o token de verificação
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 24 * 3600000); // 24 horas de validade

    await pool.query(
        'INSERT INTO email_verification_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)',
        [verificationToken, newUser.id, expires_at]
    );
    await sendVerificationEmail(newUser.email, verificationToken);

    res.status(201).json({ message: 'Registo bem-sucedido. Por favor, verifique o seu e-mail.' });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Este email já está em uso.' });
    }
    console.error('Erro no registo:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Função para fazer login
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email e palavra-passe são obrigatórios.' });
  }

  try {
    // 1. Tenta a autenticação local primeiro
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = result.rows[0];

    if (user) {
        if (!user.is_verified) {
            return res.status(401).json({ message: 'A sua conta ainda não foi verificada. Por favor, verifique o seu e-mail.' });
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
        if (isPasswordCorrect) {
            // Sucesso na autenticação local
            const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
            return res.status(200).json({ user: { id: user.id, email: user.email, name: user.name }, token });
        }
    }

    // 2. Se a autenticação local falhar ou o utilizador não existir, tenta o LDAP (se configurado)
    if (process.env.LDAP_URL) {
        // O nome de utilizador para o AD pode ser a parte do email antes do @
        const username = email.split('@')[0];
        const ldapUser = await authenticateLDAP(username, password);
        
        if (ldapUser) {
            // Se autenticado no LDAP, verifica se o utilizador já existe localmente
            let localUser = user;
            if (!localUser) {
                // Provisionamento Just-In-Time: cria o utilizador localmente
                // O hash da palavra-passe é aleatório, pois a autenticação será sempre via LDAP
                const randomPasswordHash = await bcrypt.hash(crypto.randomBytes(20).toString('hex'), 10);
                const newUserResult = await pool.query(
                    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING *',
                    [ldapUser.email, randomPasswordHash, ldapUser.name]
                );
                localUser = newUserResult.rows[0];
            }
            
            // Gera o token para o utilizador local
            const token = jwt.sign({ id: localUser.id, email: localUser.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
            return res.status(200).json({ user: { id: localUser.id, email: localUser.email, name: localUser.name }, token });
        }
    }

    // 3. Se todas as tentativas falharem
    return res.status(401).json({ message: 'Credenciais inválidas.' });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// INICIAR PROCESSO DE REDEFINIÇÃO
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = rows[0];

        // Responde sempre com sucesso para não revelar se um e-mail existe na base de dados
        if (user) {
            const token = crypto.randomBytes(32).toString('hex');
            const expires_at = new Date(Date.now() + 3600000); // 1 hora de validade

            // Apaga tokens antigos para este utilizador antes de inserir um novo
            await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
            await pool.query(
                'INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)',
                [token, user.id, expires_at]
            );

            // Envia o e-mail
            await sendPasswordResetEmail(user.email, token);
        }

        res.status(200).json({ message: 'Se o e-mail estiver registado, receberá um link para redefinir a sua palavra-passe.' });
    } catch (error) {
        console.error('Erro no forgotPassword:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// FINALIZAR PROCESSO DE REDEFINIÇÃO
export const resetPassword = async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) {
        return res.status(400).json({ message: 'O token e a nova palavra-passe são obrigatórios.' });
    }

    try {
        const { rows } = await pool.query('SELECT * FROM password_reset_tokens WHERE token = $1', [token]);
        const resetToken = rows[0];

        if (!resetToken || new Date() > resetToken.expires_at) {
            return res.status(400).json({ message: 'Token inválido ou expirado.' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, resetToken.user_id]);

        // Apaga o token após o uso
        await pool.query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);

        res.status(200).json({ message: 'Palavra-passe redefinida com sucesso.' });

    } catch (error) {
        console.error('Erro no resetPassword:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// NOVA FUNÇÃO para verificar o e-mail
export const verifyEmail = async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ message: 'Token de verificação em falta.' });
    }

    try {
        const { rows } = await pool.query('SELECT * FROM email_verification_tokens WHERE token = $1', [token]);
        const verificationToken = rows[0];

        if (!verificationToken || new Date() > verificationToken.expires_at) {
            return res.status(400).json({ message: 'Token inválido ou expirado.' });
        }

        await pool.query('UPDATE users SET is_verified = TRUE WHERE id = $1', [verificationToken.user_id]);
        await pool.query('DELETE FROM email_verification_tokens WHERE token = $1', [token]);

        res.status(200).json({ message: 'E-mail verificado com sucesso!' });

    } catch (error) {
        console.error('Erro na verificação de e-mail:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};