import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../database/db.js';
import { authenticateLDAP } from '../services/ldapService.js';
import crypto from 'crypto';

// Função para cadastrar um novo usuário
export const signup = async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
  }

  try {
    // Criptografa a senha antes de salvar
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, password_hash, name]
    );

    res.status(201).json(newUser.rows[0]);
  } catch (error) {
    // Código '23505' é para violação de constraint única (email duplicado)
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Este email já está em uso.' });
    }
    console.error('Erro no cadastro:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Função para fazer login
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
  }

  try {
    // 1. Tenta autenticação local primeiro
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = result.rows[0];

    if (user) {
        const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
        if (isPasswordCorrect) {
            // Sucesso na autenticação local
            const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
            return res.status(200).json({ user: { id: user.id, email: user.email, name: user.name }, token });
        }
    }

    // 2. Se a autenticação local falhar ou o usuário não existir, tenta o LDAP (se configurado)
    if (process.env.LDAP_URL) {
        // O username para o AD pode ser a parte do email antes do @
        const username = email.split('@')[0];
        const ldapUser = await authenticateLDAP(username, password);
        
        if (ldapUser) {
            // Se autenticou no LDAP, verifica se o usuário já existe localmente
            let localUser = user;
            if (!localUser) {
                // Provisionamento Just-In-Time: cria o usuário localmente
                // A senha hash é aleatória pois a autenticação será sempre via LDAP
                const randomPasswordHash = await bcrypt.hash(crypto.randomBytes(20).toString('hex'), 10);
                const newUserResult = await pool.query(
                    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING *',
                    [ldapUser.email, randomPasswordHash, ldapUser.name]
                );
                localUser = newUserResult.rows[0];
            }
            
            // Gera o token para o usuário local
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