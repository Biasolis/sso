import pool from '../database/db.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const generateRandomString = (length) => {
  return crypto.randomBytes(length).toString('hex');
};

const generateAccessToken = (userId, clientId, scopes) => {
    const payload = { sub: userId, aud: clientId, scp: scopes }; // Adiciona scopes (scp)
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

export const authorize = async (req, res) => {
  const {
    response_type,
    client_id,
    redirect_uri,
    scope, // Agora vamos usar este
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

    // Valida se todos os escopos solicitados são permitidos para este cliente
    const requestedScopes = scope.split(' ');
    const invalidScopes = requestedScopes.filter(s => !client.allowed_scopes.includes(s));
    if (invalidScopes.length > 0) {
        return res.status(400).send(`Escopos inválidos: ${invalidScopes.join(', ')}`);
    }

    const loginUrl = new URL('http://localhost:5173/login');
    Object.keys(req.query).forEach(key => loginUrl.searchParams.append(key, req.query[key]));
    return res.redirect(loginUrl.toString());

  } catch (error) {
    console.error('Erro no /authorize:', error);
    res.status(500).send('Erro interno do servidor.');
  }
};


export const approve = async (req, res) => {
    const { client_id, redirect_uri, state, user_token, scopes } = req.body;
    
    try {
        const decoded = jwt.verify(user_token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const code = generateRandomString(32);
        const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

        await pool.query(
            'INSERT INTO auth_codes (code, user_id, client_id, redirect_uri, expires_at, scopes) VALUES ($1, $2, $3, $4, $5, $6)',
            [code, userId, client_id, redirect_uri, expires_at, scopes]
        );

        const redirectUrl = new URL(redirect_uri);
        redirectUrl.searchParams.append('code', code);
        if (state) {
            redirectUrl.searchParams.append('state', state);
        }

        res.status(200).json({ redirectUrl: redirectUrl.toString() });

    } catch (error) {
        console.error('Erro ao aprovar consentimento:', error);
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
        // ... (lógica do refresh token permanece a mesma, mas o novo token também precisa dos escopos)
        // Por simplicidade, vamos manter os escopos originais. Numa implementação real, eles poderiam ser armazenados com o refresh token.
        const accessToken = generateAccessToken(storedToken.user_id, client.client_id, ['openid', 'profile', 'email']);
        // ...
    } else {
        return res.status(400).json({ error: 'unsupported_grant_type' });
    }

  } catch (error) {
    console.error('Erro no endpoint /token:', error);
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

        // Constrói a resposta com base nos escopos no token
        const responseData = { sub: user.id };
        if (req.scopes.includes('profile')) {
            responseData.name = user.name;
        }
        if (req.scopes.includes('email')) {
            responseData.email = user.email;
        }

        res.json(responseData);

    } catch (error) {
        console.error('Erro no /userinfo:', error);
        res.status(500).json({ error: 'server_error' });
    }
};