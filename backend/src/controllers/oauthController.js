import pool from '../database/db.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import logger from '../config/logger.js';

const generateRandomString = (length) => {
  return crypto.randomBytes(length).toString('hex');
};

const generateAccessToken = (userId, clientId, scopes) => {
    const payload = { sub: userId, aud: clientId, scp: scopes };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

export const authorize = async (req, res) => {
  const {
    response_type,
    client_id,
    redirect_uri,
    scope,
    state
  } = req.query;

  if (response_type !== 'code') {
    return res.status(400).send('response_type inválido. Apenas "code" é suportado.');
  }
  if (!scope) {
      return res.status(400).send('O parâmetro "scope" é obrigatório.');
  }

  try {
    const { rows } = await pool.query('SELECT * FROM clients WHERE client_id = $1', [client_id]);
    const client = rows[0];

    if (!client) {
      return res.status(400).send('Cliente inválido.');
    }

    if (!client.redirect_uris.includes(redirect_uri)) {
      return res.status(400).send('redirect_uri inválido.');
    }

    const requestedScopes = scope.split(' ');
    const invalidScopes = requestedScopes.filter(s => !client.allowed_scopes.includes(s));
    if (invalidScopes.length > 0) {
        return res.status(400).send(`Escopos inválidos: ${invalidScopes.join(', ')}`);
    }

    const loginUrl = new URL(`${process.env.FRONTEND_URL}/login`);
    Object.keys(req.query).forEach(key => loginUrl.searchParams.append(key, req.query[key]));
    return res.redirect(loginUrl.toString());

  } catch (error) {
    logger.error('Erro no /authorize:', error);
    res.status(500).send('Erro interno do servidor.');
  }
};


export const approve = async (req, res) => {
    const { client_id, redirect_uri, state, user_token, scopes } = req.body;
    
    try {
        const decoded = jwt.verify(user_token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const clientResult = await pool.query('SELECT id FROM clients WHERE client_id = $1', [client_id]);
        if (clientResult.rows.length === 0) {
            return res.status(400).json({ message: 'Cliente inválido.' });
        }
        const internalClientId = clientResult.rows[0].id;

        const userPermissionResult = await pool.query(
            'SELECT 1 FROM client_users WHERE client_id = $1 AND user_id = $2',
            [internalClientId, userId]
        );

        const userGroupsResult = await pool.query(
            'SELECT 1 FROM client_groups cg JOIN user_groups ug ON cg.group_id = ug.group_id WHERE cg.client_id = $1 AND ug.user_id = $2',
            [internalClientId, userId]
        );

        const hasPermission = userPermissionResult.rowCount > 0 || userGroupsResult.rowCount > 0;

        const clientAssignments = await pool.query(
            'SELECT (SELECT COUNT(*) FROM client_users WHERE client_id = $1) + (SELECT COUNT(*) FROM client_groups WHERE client_id = $1) AS total',
            [internalClientId]
        );
        const hasAnyAssignment = clientAssignments.rows[0].total > 0;

        if (hasAnyAssignment && !hasPermission) {
            logger.warn(`Acesso negado para o utilizador ${userId} ao cliente ${client_id}.`);
            const deniedUrl = new URL(redirect_uri);
            deniedUrl.searchParams.append('error', 'access_denied');
            deniedUrl.searchParams.append('error_description', 'O utilizador não tem permissão para aceder a esta aplicação.');
            if (state) deniedUrl.searchParams.append('state', state);
            return res.status(200).json({ redirectUrl: deniedUrl.toString() });
        }

        // INSERIR REGISTO DE ACESSO
        await pool.query(
            'INSERT INTO sso_access_logs (user_id, client_id) VALUES ($1, $2)',
            [userId, internalClientId]
        );

        const code = generateRandomString(32);
        const expires_at = new Date(Date.now() + 10 * 60 * 1000);

        await pool.query(
            'INSERT INTO auth_codes (code, user_id, client_id, redirect_uri, expires_at, scopes) VALUES ($1, $2, $3, $4, $5, $6)',
            [code, userId, client_id, redirect_uri, expires_at, scopes]
        );

        const redirectUrl = new URL(redirect_uri);
        redirectUrl.searchParams.append('code', code);
        if (state) {
            redirectUrl.searchParams.append('state', state);
        }

        logger.info(`Acesso SSO bem-sucedido e código de autorização gerado para o utilizador ${userId} para o cliente ${client_id}`);
        res.status(200).json({ redirectUrl: redirectUrl.toString() });

    } catch (error) {
        logger.error('Erro ao aprovar o consentimento:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};


export const token = async (req, res) => {
  const { grant_type } = req.body;

  try {
    const clientResult = await pool.query('SELECT * FROM clients WHERE client_id = $1 AND client_secret = $2', [req.body.client_id, req.body.client_secret]);
    const client = clientResult.rows[0];
    if (!client) {
        return res.status(401).json({ error: 'invalid_client' });
    }

    if (grant_type === 'authorization_code') {
        const { code, redirect_uri } = req.body;
        const codeResult = await pool.query('SELECT * FROM auth_codes WHERE code = $1', [code]);
        const authCode = codeResult.rows[0];

        if (!authCode || authCode.client_id !== client.client_id || authCode.redirect_uri !== redirect_uri || new Date() > authCode.expires_at) {
            return res.status(400).json({ error: 'invalid_grant' });
        }
        await pool.query('DELETE FROM auth_codes WHERE code = $1', [code]);

        const accessToken = generateAccessToken(authCode.user_id, client.client_id, authCode.scopes);
        const refreshToken = generateRandomString(64);
        const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias

        await pool.query(
            'INSERT INTO refresh_tokens (token, user_id, client_id, expires_at) VALUES ($1, $2, $3, $4)',
            [refreshToken, authCode.user_id, client.client_id, refreshTokenExpiresAt]
        );

        return res.json({
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: 'Bearer',
            expires_in: 3600,
        });

    } else if (grant_type === 'refresh_token') {
        const { refresh_token } = req.body;
        const tokenResult = await pool.query('SELECT * FROM refresh_tokens WHERE token = $1', [refresh_token]);
        const storedToken = tokenResult.rows[0];

        if (!storedToken || storedToken.is_revoked || new Date() > storedToken.expires_at || storedToken.client_id !== client.client_id) {
            return res.status(400).json({ error: 'invalid_grant' });
        }

        await pool.query('UPDATE refresh_tokens SET is_revoked = TRUE WHERE token = $1', [refresh_token]);
        
        const newAccessToken = generateAccessToken(storedToken.user_id, client.client_id, ['openid', 'profile', 'email']);
        const newRefreshToken = generateRandomString(64);
        const newRefreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await pool.query(
            'INSERT INTO refresh_tokens (token, user_id, client_id, expires_at) VALUES ($1, $2, $3, $4)',
            [newRefreshToken, storedToken.user_id, client.client_id, newRefreshTokenExpiresAt]
        );

        return res.json({
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
            token_type: 'Bearer',
            expires_in: 3600,
        });

    } else {
        return res.status(400).json({ error: 'unsupported_grant_type' });
    }

  } catch (error) {
    logger.error('Erro no endpoint /token:', error);
    res.status(500).json({ error: 'server_error' });
  }
};

export const userinfo = async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, name, email FROM users WHERE id = $1',
            [req.userId]
        );
        const user = rows[0];

        if (!user) {
            return res.status(404).json({ error: 'user_not_found' });
        }

        const responseData = { sub: user.id };
        if (req.scopes.includes('profile')) {
            responseData.name = user.name;
        }
        if (req.scopes.includes('email')) {
            responseData.email = user.email;
        }

        res.json(responseData);

    } catch (error) {
        logger.error('Erro no /userinfo:', error);
        res.status(500).json({ error: 'server_error' });
    }
};