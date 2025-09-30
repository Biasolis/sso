import pool from '../database/db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import logger from '../config/logger.js';

const generateSecureString = (length = 32) => crypto.randomBytes(length).toString('hex');

export const getDashboardMetrics = async (req, res) => {
    try {
        const userCountQuery = pool.query('SELECT COUNT(*) FROM users');
        const clientCountQuery = pool.query('SELECT COUNT(*) FROM clients');
        const groupCountQuery = pool.query('SELECT COUNT(*) FROM groups');
        const recentLoginsQuery = pool.query(`
            SELECT 
                sal.id,
                u.name as user_name,
                u.email as user_email,
                c.client_name,
                sal.created_at
            FROM sso_access_logs sal
            JOIN users u ON sal.user_id = u.id
            JOIN clients c ON sal.client_id = c.id
            ORDER BY sal.created_at DESC
            LIMIT 10;
        `);

        const [userCount, clientCount, groupCount, recentLogins] = await Promise.all([
            userCountQuery,
            clientCountQuery,
            groupCountQuery,
            recentLoginsQuery
        ]);

        res.status(200).json({
            totalUsers: parseInt(userCount.rows[0].count, 10),
            totalClients: parseInt(clientCount.rows[0].count, 10),
            totalGroups: parseInt(groupCount.rows[0].count, 10),
            recentLogins: recentLogins.rows,
        });

    } catch (error) {
        logger.error('Erro ao buscar as métricas do dashboard:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Users
export const getUsers = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, email, name, is_superadmin, is_verified, created_at, updated_at FROM users');
    res.status(200).json(rows);
  } catch (error) {
    logger.error('Erro ao buscar utilizadores:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Utilizador não encontrado.' });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    logger.error(`Erro ao buscar utilizador ${id}:`, error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

export const createUser = async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email e palavra-passe são obrigatórios.' });
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
        logger.error('Erro no registo de utilizador:', error);
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
            return res.status(404).json({ message: 'Utilizador não encontrado.' });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Este email já está em uso.' });
        }
        logger.error(`Erro ao atualizar utilizador ${id}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};


export const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const deleteOp = await pool.query('DELETE FROM users WHERE id = $1', [id]);
        if (deleteOp.rowCount === 0) {
            return res.status(404).json({ message: 'Utilizador não encontrado.' });
        }
        res.status(204).send();
    } catch (error) {
        logger.error(`Erro ao apagar utilizador ${id}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

export const promoteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await pool.query(
            'UPDATE users SET is_superadmin = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Utilizador não encontrado.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        logger.error(`Erro ao promover utilizador ${id}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// NOVA FUNÇÃO
export const verifyUser = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await pool.query(
            'UPDATE users SET is_verified = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Utilizador não encontrado.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        logger.error(`Erro ao verificar o utilizador ${id}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Groups
export const getGroups = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM groups');
        res.status(200).json(rows);
    } catch (error) {
        logger.error('Erro ao buscar grupos:', error);
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
        logger.error('Erro ao criar grupo:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

export const updateGroup = async (req, res) => {
    const { id } = req.params;
    const { name, ldap_dn = null } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'O nome do grupo é obrigatório.' });
    }

    try {
        const { rows } = await pool.query(
            'UPDATE groups SET name = $1, ldap_dn = $2 WHERE id = $3 RETURNING *',
            [name, ldap_dn, id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Grupo não encontrado.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'O nome do grupo ou o DN do LDAP já estão em uso.' });
        }
        logger.error(`Erro ao atualizar o grupo ${id}:`, error);
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
        logger.error(`Erro ao apagar grupo ${id}:`, error);
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
        res.status(201).json({ message: 'Utilizador adicionado ao grupo com sucesso.' });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Utilizador já pertence a este grupo.' });
        }
        if (error.code === '23503') {
            return res.status(404).json({ message: 'Utilizador ou grupo não encontrado.' });
        }
        logger.error(`Erro ao adicionar utilizador ${userId} ao grupo ${groupId}:`, error);
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
        logger.error(`Erro ao remover utilizador ${userId} do grupo ${groupId}:`, error);
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
        logger.error(`Erro ao buscar membros do grupo ${id}:`, error);
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
        logger.error(`Erro ao buscar utilizadores fora do grupo ${id}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// OAuth Clients
export const getClients = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, client_id, client_name, redirect_uris, allowed_scopes FROM clients');
        res.status(200).json(rows);
    } catch (error) {
        logger.error('Erro ao buscar clientes:', error);
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
        logger.error('Erro ao criar cliente:', error);
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
        logger.error(`Erro ao apagar cliente ${id}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Client Permissions
export const getClientPermissions = async (req, res) => {
    const { id } = req.params;
    try {
        const assignedUsersQuery = pool.query('SELECT u.id, u.name, u.email FROM users u JOIN client_users cu ON u.id = cu.user_id WHERE cu.client_id = $1', [id]);
        const assignedGroupsQuery = pool.query('SELECT g.id, g.name FROM groups g JOIN client_groups cg ON g.id = cg.group_id WHERE cg.client_id = $1', [id]);
        const availableUsersQuery = pool.query('SELECT id, name, email FROM users WHERE id NOT IN (SELECT user_id FROM client_users WHERE client_id = $1)', [id]);
        const availableGroupsQuery = pool.query('SELECT id, name FROM groups WHERE id NOT IN (SELECT group_id FROM client_groups WHERE client_id = $1)', [id]);

        const [assignedUsers, assignedGroups, availableUsers, availableGroups] = await Promise.all([assignedUsersQuery, assignedGroupsQuery, availableUsersQuery, availableGroupsQuery]);

        res.status(200).json({
            assignedUsers: assignedUsers.rows,
            assignedGroups: assignedGroups.rows,
            availableUsers: availableUsers.rows,
            availableGroups: availableGroups.rows
        });
    } catch (error) {
        logger.error(`Erro ao buscar permissões para o cliente ${id}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

export const addClientPermission = async (req, res) => {
    const { id } = req.params;
    const { type, entityId } = req.body;
    
    if (!type || !entityId) {
        return res.status(400).json({ message: 'O tipo (user/group) e o ID da entidade são obrigatórios.' });
    }

    const table = type === 'user' ? 'client_users' : 'client_groups';
    const column = type === 'user' ? 'user_id' : 'group_id';

    try {
        await pool.query(`INSERT INTO ${table} (client_id, ${column}) VALUES ($1, $2)`, [id, entityId]);
        res.status(201).json({ message: 'Permissão adicionada com sucesso.' });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Esta permissão já existe.' });
        }
        logger.error(`Erro ao adicionar permissão ao cliente ${id}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

export const removeClientPermission = async (req, res) => {
    const { id } = req.params;
    const { type, entityId } = req.body;
    
    if (!type || !entityId) {
        return res.status(400).json({ message: 'O tipo (user/group) e o ID da entidade são obrigatórios.' });
    }

    const table = type === 'user' ? 'client_users' : 'client_groups';
    const column = type === 'user' ? 'user_id' : 'group_id';

    try {
        const result = await pool.query(`DELETE FROM ${table} WHERE client_id = $1 AND ${column} = $2`, [id, entityId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Permissão não encontrada.' });
        }
        res.status(204).send();
    } catch (error) {
        logger.error(`Erro ao remover permissão do cliente ${id}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};