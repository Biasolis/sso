import pool from '../database/db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const generateSecureString = (length = 32) => crypto.randomBytes(length).toString('hex');

// Users
export const getUsers = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, email, name, is_superadmin, created_at, updated_at FROM users');
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

export const createUser = async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
            [email, password_hash, name]
        );

        res.status(201).json(newUser.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Este email já está em uso.' });
        }
        console.error('Erro no cadastro:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

export const updateUser = async (req, res) => {
    const { id } = req.params;
    const { email, name, password } = req.body;

    try {
        let password_hash;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            password_hash = await bcrypt.hash(password, salt);
        }

        const { rows } = await pool.query(
            `UPDATE users SET
                email = COALESCE($1, email),
                name = COALESCE($2, name),
                password_hash = COALESCE($3, password_hash),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4 RETURNING id, email, name, updated_at`,
            [email, name, password_hash, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Este email já está em uso.' });
        }
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};


export const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const deleteOp = await pool.query('DELETE FROM users WHERE id = $1', [id]);
        if (deleteOp.rowCount === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

export const promoteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await pool.query(
            'UPDATE users SET is_superadmin = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, email, is_superadmin',
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Erro ao promover usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};


// Groups
export const getGroups = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM groups');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Erro ao buscar grupos:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

export const createGroup = async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'O nome do grupo é obrigatório.' });
    }
    try {
        const { rows } = await pool.query(
            'INSERT INTO groups (name) VALUES ($1) RETURNING *',
            [name]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Este nome de grupo já está em uso.' });
        }
        console.error('Erro ao criar grupo:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

export const deleteGroup = async (req, res) => {
    const { id } = req.params;
    try {
        const deleteOp = await pool.query('DELETE FROM groups WHERE id = $1', [id]);
        if (deleteOp.rowCount === 0) {
            return res.status(404).json({ message: 'Grupo não encontrado.' });
        }
        res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar grupo:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// User-Groups Association
export const addUserToGroup = async (req, res) => {
    const { userId, groupId } = req.body;
    if (!userId || !groupId) {
        return res.status(400).json({ message: 'userId e groupId são obrigatórios.' });
    }
    try {
        await pool.query(
            'INSERT INTO user_groups (user_id, group_id) VALUES ($1, $2)',
            [userId, groupId]
        );
        res.status(201).json({ message: 'Usuário adicionado ao grupo com sucesso.' });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Usuário já pertence a este grupo.' });
        }
        if (error.code === '23503') {
            return res.status(404).json({ message: 'Usuário ou grupo não encontrado.' });
        }
        console.error('Erro ao adicionar usuário ao grupo:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

export const removeUserFromGroup = async (req, res) => {
    const { userId, groupId } = req.body;
     if (!userId || !groupId) {
        return res.status(400).json({ message: 'userId e groupId são obrigatórios.' });
    }
    try {
        const deleteOp = await pool.query(
            'DELETE FROM user_groups WHERE user_id = $1 AND group_id = $2',
            [userId, groupId]
        );
        if (deleteOp.rowCount === 0) {
            return res.status(404).json({ message: 'Associação não encontrada.' });
        }
        res.status(204).send();
    } catch (error) {
        console.error('Erro ao remover usuário do grupo:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

export const getGroupWithMembers = async (req, res) => {
    const { id } = req.params;
    try {
        const groupQuery = pool.query('SELECT * FROM groups WHERE id = $1', [id]);
        const membersQuery = pool.query(
            `SELECT u.id, u.name, u.email FROM users u
             JOIN user_groups ug ON u.id = ug.user_id
             WHERE ug.group_id = $1`, [id]
        );
        
        const [groupResult, membersResult] = await Promise.all([groupQuery, membersQuery]);

        if (groupResult.rows.length === 0) {
            return res.status(404).json({ message: 'Grupo não encontrado.' });
        }

        res.status(200).json({
            ...groupResult.rows[0],
            members: membersResult.rows
        });

    } catch (error) {
        console.error('Erro ao buscar membros do grupo:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

export const getUsersNotInGroup = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await pool.query(
            `SELECT id, name, email FROM users
             WHERE id NOT IN (SELECT user_id FROM user_groups WHERE group_id = $1)`, [id]
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error('Erro ao buscar usuários fora do grupo:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// OAuth Clients
export const getClients = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, client_id, client_name, redirect_uris FROM clients');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

export const createClient = async (req, res) => {
    const { client_name, redirect_uris } = req.body;
    if (!client_name || !redirect_uris || !Array.isArray(redirect_uris) || redirect_uris.length === 0) {
        return res.status(400).json({ message: 'Nome do cliente e uma lista de redirect_uris são obrigatórios.' });
    }

    const client_id = generateSecureString(16);
    const client_secret = generateSecureString(32);

    try {
        const { rows } = await pool.query(
            'INSERT INTO clients (client_id, client_secret, client_name, redirect_uris) VALUES ($1, $2, $3, $4) RETURNING *',
            [client_id, client_secret, client_name, redirect_uris]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Erro ao criar cliente:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

export const deleteClient = async (req, res) => {
    const { id } = req.params;
    try {
        const deleteOp = await pool.query('DELETE FROM clients WHERE id = $1', [id]);
        if (deleteOp.rowCount === 0) {
            return res.status(404).json({ message: 'Cliente não encontrado.' });
        }
        res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar cliente:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};