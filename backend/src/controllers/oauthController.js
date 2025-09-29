import pool from '../database/db.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Função para gerar strings aleatórias seguras
const generateRandomString = (length) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Passo 1 do fluxo OAuth: Ponto de Autorização
 * Valida a requisição do cliente e redireciona para o login/consentimento.
 */
export const authorize = async (req, res) => {
  const {
    response_type,
    client_id,
    redirect_uri,
    scope, // Não estamos usando scope ainda, mas é parte do padrão
    state
  } = req.query;

  // Validação básica da requisição
  if (response_type !== 'code') {
    return res.status(400).send('response_type inválido. Apenas "code" é suportado.');
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

    // Se o usuário não estiver logado, redireciona para a página de login,
    // passando os parâmetros OAuth para que possamos continuar o fluxo depois.
    const userToken = req.headers.authorization?.split(' ')[1];
    if (!userToken) {
      const loginUrl = new URL('http://localhost:5173/login'); // URL do seu frontend
      Object.keys(req.query).forEach(key => loginUrl.searchParams.append(key, req.query[key]));
      return res.redirect(loginUrl.toString());
    }

    // Se o usuário já está logado, redirecionamos para a página de consentimento
    const consentUrl = new URL('http://localhost:5173/consent');
    Object.keys(req.query).forEach(key => consentUrl.searchParams.append(key, req.query[key]));
    
    // Passamos o token do usuário logado para a página de consentimento saber quem ele é
    consentUrl.searchParams.append('user_token', userToken);
    
    res.redirect(consentUrl.toString());

  } catch (error) {
    console.error('Erro no /authorize:', error);
    res.status(500).send('Erro interno do servidor.');
  }
};


/**
 * Passo 2: O usuário dá o consentimento (do frontend para o backend)
 * Gera o código de autorização e redireciona de volta para o cliente.
 */
export const approve = async (req, res) => {
    const { client_id, redirect_uri, state, user_token } = req.body;
    
    try {
        const decoded = jwt.verify(user_token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const code = generateRandomString(32);
        const expires_at = new Date(Date.now() + 10 * 60 * 1000); // Válido por 10 minutos

        await pool.query(
            'INSERT INTO auth_codes (code, user_id, client_id, redirect_uri, expires_at) VALUES ($1, $2, $3, $4, $5)',
            [code, userId, client_id, redirect_uri, expires_at]
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


/**
 * Passo 3: Troca do Código pelo Token
 * O cliente envia o código de autorização para obter um access token.
 */
export const token = async (req, res) => {
  const {
    grant_type,
    code,
    redirect_uri,
    client_id,
    client_secret
  } = req.body;

  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'invalid_grant' });
  }

  try {
    // 1. Validar o cliente
    const clientResult = await pool.query('SELECT * FROM clients WHERE client_id = $1 AND client_secret = $2', [client_id, client_secret]);
    const client = clientResult.rows[0];
    if (!client) {
        return res.status(401).json({ error: 'invalid_client' });
    }
    
    // 2. Validar o código de autorização
    const codeResult = await pool.query('SELECT * FROM auth_codes WHERE code = $1', [code]);
    const authCode = codeResult.rows[0];

    if (!authCode || authCode.client_id !== client_id || authCode.redirect_uri !== redirect_uri || new Date() > authCode.expires_at) {
        return res.status(400).json({ error: 'invalid_grant' });
    }
    
    // 3. Deletar o código (só pode ser usado uma vez)
    await pool.query('DELETE FROM auth_codes WHERE code = $1', [code]);

    // 4. Gerar o Access Token (neste caso, um JWT)
    const accessTokenPayload = {
        sub: authCode.user_id, // "subject" do token é o ID do usuário
        aud: client_id,       // "audience" do token é o client_id
    };

    const accessToken = jwt.sign(accessTokenPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
    });

  } catch (error) {
    console.error('Erro no /token:', error);
    res.status(500).json({ error: 'server_error' });
  }
};

/**
 * Passo 4: Obter informações do usuário
 * A aplicação cliente chama este endpoint com o access token para obter os dados do usuário.
 */
export const userinfo = async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, name, email FROM users WHERE id = $1',
            [req.userId] // req.userId foi adicionado pelo middleware verifyAccessToken
        );
        const user = rows[0];

        if (!user) {
            return res.status(404).json({ error: 'user_not_found' });
        }

        // O padrão OIDC retorna o ID do usuário no campo 'sub'
        res.json({
            sub: user.id,
            name: user.name,
            email: user.email
        });

    } catch (error) {
        console.error('Erro no /userinfo:', error);
        res.status(500).json({ error: 'server_error' });
    }
};