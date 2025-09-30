import pool from '../database/db.js';
import bcrypt from 'bcryptjs';

// Obter os detalhes do utilizador atualmente autenticado
export const getMyAccount = async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, name, email FROM users WHERE id = $1',
            [req.user.id] // req.user.id é fornecido pelo middleware isAuthenticated
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Utilizador não encontrado.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Erro ao obter dados da conta:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Atualizar o nome do utilizador
export const updateMyAccount = async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'O nome é obrigatório.' });
    }
    try {
        const { rows } = await pool.query(
            'UPDATE users SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email',
            [name, req.user.id]
        );
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar a conta:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Alterar a palavra-passe
export const changeMyPassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'A palavra-passe atual e a nova são obrigatórias.' });
    }

    try {
        // 1. Obter o hash da palavra-passe atual do utilizador
        const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        const user = rows[0];

        if (!user) {
            return res.status(404).json({ message: 'Utilizador não encontrado.' });
        }

        // 2. Verificar se a palavra-passe atual está correta
        const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'A palavra-passe atual está incorreta.' });
        }

        // 3. Gerar o hash da nova palavra-passe e atualizar no banco de dados
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, req.user.id]);

        res.status(200).json({ message: 'Palavra-passe alterada com sucesso.' });

    } catch (error) {
        console.error('Erro ao alterar a palavra-passe:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};