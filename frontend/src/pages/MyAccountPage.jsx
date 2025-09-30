import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import apiClient from '../api/axiosConfig';
import useAuth from '../hooks/useAuth';
import './MyAccountPage.css';

function MyAccountPage() {
    const { user } = useAuth();
    const [name, setName] = useState('');

    useEffect(() => {
        if (user) {
            setName(user.name);
        }
    }, [user]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        const promise = apiClient.put('/api/account', { name });
        toast.promise(promise, {
            loading: 'A atualizar perfil...',
            success: 'Perfil atualizado com sucesso!',
            error: 'Falha ao atualizar o perfil.'
        });
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        const { currentPassword, newPassword } = e.target.elements;
        
        const promise = apiClient.post('/api/account/change-password', {
            currentPassword: currentPassword.value,
            newPassword: newPassword.value,
        });

        toast.promise(promise, {
            loading: 'A alterar a palavra-passe...',
            success: () => {
                e.target.reset(); // Limpa os campos do formulário em caso de sucesso
                return 'Palavra-passe alterada com sucesso!';
            },
            error: (err) => {
                return err.response?.data?.message || 'Falha ao alterar a palavra-passe.';
            }
        });
    };
    
    return (
        <div className="account-page">
            <h1>A Minha Conta</h1>

            <div className="account-card">
                <h2>Informações do Perfil</h2>
                <form onSubmit={handleProfileUpdate}>
                    <div className="form-group">
                        <label htmlFor="email">Email:</label>
                        <input id="email" type="email" value={user?.email || ''} disabled />
                    </div>
                    <div className="form-group">
                        <label htmlFor="name">Nome:</label>
                        <input 
                            id="name" 
                            type="text" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn-save">Guardar Alterações</button>
                    </div>
                </form>
            </div>

            <div className="account-card">
                <h2>Alterar Palavra-passe</h2>
                <form onSubmit={handlePasswordChange}>
                    <div className="form-group">
                        <label htmlFor="currentPassword">Palavra-passe Atual:</label>
                        <input id="currentPassword" type="password" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="newPassword">Nova Palavra-passe:</label>
                        <input id="newPassword" type="password" required />
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn-save">Alterar Palavra-passe</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default MyAccountPage;