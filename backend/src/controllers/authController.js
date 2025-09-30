import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../database/db.js';
import { authenticateLDAP } from '../services/ldapService.js';
import crypto from 'crypto';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/mailService.js';
import logger from '../config/logger.js';

// Função auxiliar para sincronizar os grupos do LDAP
const syncLdapGroups = async (userId, ldapGroupDNs) => {
    try {
        // Busca todos os grupos locais que estão mapeados para os grupos do LDAP do utilizador
        const { rows: mappedGroups } = await pool.query(
            'SELECT id FROM groups WHERE ldap_dn = ANY($1::text[])',
            [ldapGroupDNs]
        );
        const mappedGroupIds = mappedGroups.map(g => g.id);

        // Apaga todas as associações de grupo existentes para este utilizador (que vieram do LDAP)
        await pool.query(
            `DELETE FROM user_groups WHERE user_id = $1 AND group_id IN (SELECT id FROM groups WHERE ldap_dn IS NOT NULL)`,
            [userId]
        );

        // Insere as novas associações
        if (mappedGroupIds.length > 0) {
            const insertValues = mappedGroupIds.map(groupId => `('${userId}', '${groupId}')`).join(',');
            await pool.query(`INSERT INTO user_groups (user_id, group_id) VALUES ${insertValues}`);
        }
        logger.info(`Grupos LDAP sincronizados para o utilizador ${userId}`);
    } catch (error) {
        logger.error(`Falha ao sincronizar os grupos do LDAP para o utilizador ${userId}:`, error);
    }
};

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

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 24 * 3600000);

    await pool.query(
        'INSERT INTO email_verification_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)',
        [verificationToken, newUser.id, expires_at]
    );
    await sendVerificationEmail(newUser.email, verificationToken);

    logger.info(`Novo registo para ${email}. E-mail de verificação enviado.`);
    res.status(201).json({ message: 'Registo bem-sucedido. Por favor, verifique o seu e-mail.' });

  } catch (error) {
    if (error.code === '23505') {
      logger.warn(`Tentativa de registo falhada para e-mail já existente: ${email}`);
      return res.status(409).json({ message: 'Este email já está em uso.' });
    }
    logger.error('Erro no registo:', error);
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
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = result.rows[0];

    const processLogin = (loggedInUser) => {
        const token = jwt.sign({ id: loggedInUser.id, email: loggedInUser.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
        const userPayload = {
            id: loggedInUser.id,
            email: loggedInUser.email,
            name: loggedInUser.name,
            is_superadmin: loggedInUser.is_superadmin 
        };
        return res.status(200).json({ user: userPayload, token });
    };

    if (user) {
        if (!user.is_verified) {
            logger.warn(`Tentativa de login falhada para e-mail não verificado: ${email}`);
            return res.status(401).json({ message: 'A sua conta ainda não foi verificada. Por favor, verifique o seu e-mail.' });
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
        if (isPasswordCorrect) {
            logger.info(`Login bem-sucedido (local) para: ${email}`);
            return processLogin(user);
        }
    }

    if (process.env.LDAP_URL && process.env.LDAP_ACTIVATION_GROUP_DN) {
        const username = email.split('@')[0];
        const ldapUser = await authenticateLDAP(username, password);
        
        if (ldapUser) {
            if (!user) {
                const activationGroup = process.env.LDAP_ACTIVATION_GROUP_DN;
                if (!ldapUser.groups || !ldapUser.groups.includes(activationGroup)) {
                    logger.warn(`Tentativa de login LDAP falhada para ${email}: não pertence ao grupo de ativação.`);
                    return res.status(403).json({ message: 'Não tem permissão para aceder a este sistema.' });
                }
                
                const randomPasswordHash = await bcrypt.hash(crypto.randomBytes(20).toString('hex'), 10);
                const newUserResult = await pool.query(
                    'INSERT INTO users (email, password_hash, name, is_verified) VALUES ($1, $2, $3, TRUE) RETURNING *',
                    [ldapUser.email, randomPasswordHash, ldapUser.name]
                );
                user = newUserResult.rows[0];
                logger.info(`Utilizador LDAP provisionado localmente: ${ldapUser.email}`);
            }
            
            await syncLdapGroups(user.id, ldapUser.groups);
            
            logger.info(`Login bem-sucedido (LDAP) para: ${email}`);
            return processLogin(user);
        }
    }
    
    logger.warn(`Tentativa de login falhada para: ${email}`);
    return res.status(401).json({ message: 'Credenciais inválidas.' });

  } catch (error) {
    logger.error(`Erro no processo de login para ${email}:`, error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// INICIAR PROCESSO DE REDEFINIÇÃO
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = rows[0];

        if (user) {
            const token = crypto.randomBytes(32).toString('hex');
            const expires_at = new Date(Date.now() + 3600000); // 1 hora de validade

            await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
            await pool.query(
                'INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)',
                [token, user.id, expires_at]
            );

            await sendPasswordResetEmail(user.email, token);
            logger.info(`Pedido de redefinição de palavra-passe para: ${email}`);
        } else {
            logger.info(`Pedido de redefinição de palavra-passe para e-mail não registado: ${email}`);
        }

        res.status(200).json({ message: 'Se o e-mail estiver registado, receberá um link para redefinir a sua palavra-passe.' });
    } catch (error) {
        logger.error(`Erro no forgotPassword para ${email}:`, error);
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
            logger.warn(`Tentativa de redefinição de palavra-passe com token inválido ou expirado.`);
            return res.status(400).json({ message: 'Token inválido ou expirado.' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, resetToken.user_id]);
        await pool.query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);

        logger.info(`Palavra-passe redefinida com sucesso para o utilizador ID: ${resetToken.user_id}`);
        res.status(200).json({ message: 'Palavra-passe redefinida com sucesso.' });

    } catch (error) {
        logger.error(`Erro no resetPassword:`, error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// VERIFICAR O E-MAIL
export const verifyEmail = async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ message: 'Token de verificação em falta.' });
    }

    try {
        const { rows } = await pool.query('SELECT * FROM email_verification_tokens WHERE token = $1', [token]);
        const verificationToken = rows[0];

        if (!verificationToken || new Date() > verificationToken.expires_at) {
            logger.warn(`Tentativa de verificação de e-mail com token inválido ou expirado.`);
            return res.status(400).json({ message: 'Token inválido ou expirado.' });
        }

        await pool.query('UPDATE users SET is_verified = TRUE WHERE id = $1', [verificationToken.user_id]);
        await pool.query('DELETE FROM email_verification_tokens WHERE token = $1', [token]);

        logger.info(`E-mail verificado com sucesso para o utilizador ID: ${verificationToken.user_id}`);
        res.status(200).json({ message: 'E-mail verificado com sucesso!' });

    } catch (error) {
        logger.error(`Erro na verificação de e-mail:`, error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};