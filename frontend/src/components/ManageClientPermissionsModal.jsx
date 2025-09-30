import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import apiClient from '../api/axiosConfig';
import Modal from './Modal'; // Reutilizamos o nosso componente de modal base
import './ManageClientPermissionsModal.css';

function ManageClientPermissionsModal({ isOpen, onClose, client }) {
    const [permissions, setPermissions] = useState({
        assignedUsers: [],
        assignedGroups: [],
        availableUsers: [],
        availableGroups: []
    });
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!client) return;
        try {
            setLoading(true);
            const response = await apiClient.get(`/superadmin/clients/${client.id}/permissions`);
            setPermissions(response.data);
        } catch (error) {
            toast.error('Falha ao carregar as permissões do cliente.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen, client]);

    const handleAddPermission = async (type, entity) => {
        try {
            await apiClient.post(`/superadmin/clients/${client.id}/permissions`, { type, entityId: entity.id });
            toast.success(`${type === 'user' ? 'Utilizador' : 'Grupo'} adicionado com sucesso.`);
            fetchData(); // Recarrega os dados para atualizar as listas
        } catch (error) {
            toast.error(`Falha ao adicionar ${type === 'user' ? 'utilizador' : 'grupo'}.`);
        }
    };
    
    const handleRemovePermission = async (type, entity) => {
        try {
            await apiClient.delete(`/superadmin/clients/${client.id}/permissions`, { data: { type, entityId: entity.id } });
            toast.success(`${type === 'user' ? 'Utilizador' : 'Grupo'} removido com sucesso.`);
            fetchData(); // Recarrega os dados
        } catch (error) {
            toast.error(`Falha ao remover ${type === 'user' ? 'utilizador' : 'grupo'}.`);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Gerir Acesso para: ${client?.client_name}`}>
            {loading ? <p>A carregar...</p> : (
                <div className="permissions-container">
                    {/* Secção de Utilizadores */}
                    <div className="permissions-section">
                        <h3>Utilizadores com Acesso</h3>
                        <ul className="entity-list">
                            {permissions.assignedUsers.map(user => (
                                <li key={user.id}><span>{user.name} ({user.email})</span> <button onClick={() => handleRemovePermission('user', user)} className="btn-remove">Remover</button></li>
                            ))}
                        </ul>
                        <h3>Utilizadores Disponíveis</h3>
                        <ul className="entity-list">
                            {permissions.availableUsers.map(user => (
                                <li key={user.id}><span>{user.name} ({user.email})</span> <button onClick={() => handleAddPermission('user', user)} className="btn-add-permission">Adicionar</button></li>
                            ))}
                        </ul>
                    </div>
                    {/* Secção de Grupos */}
                    <div className="permissions-section">
                        <h3>Grupos com Acesso</h3>
                        <ul className="entity-list">
                            {permissions.assignedGroups.map(group => (
                                <li key={group.id}><span>{group.name}</span> <button onClick={() => handleRemovePermission('group', group)} className="btn-remove">Remover</button></li>
                            ))}
                        </ul>
                        <h3>Grupos Disponíveis</h3>
                        <ul className="entity-list">
                            {permissions.availableGroups.map(group => (
                                <li key={group.id}><span>{group.name}</span> <button onClick={() => handleAddPermission('group', group)} className="btn-add-permission">Adicionar</button></li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </Modal>
    );
}

export default ManageClientPermissionsModal;