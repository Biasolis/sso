import { useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig';
import { toast } from 'react-hot-toast'; // Importar toast
import './ManageMembersModal.css';

function ManageMembersModal({ isOpen, onClose, group }) {
  const [members, setMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [membersRes, availableUsersRes] = await Promise.all([
          apiClient.get(`/superadmin/groups/${group.id}/members`),
          apiClient.get(`/superadmin/groups/${group.id}/available-users`),
        ]);
        setMembers(membersRes.data.members);
        setAvailableUsers(availableUsersRes.data);
      } catch (err) {
        toast.error('Falha ao carregar dados dos membros.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, group]);

  const handleAddUser = async (userId) => {
    try {
        await apiClient.post('/superadmin/groups/addUser', { userId, groupId: group.id });
        const userToAdd = availableUsers.find(u => u.id === userId);
        setMembers([...members, userToAdd]);
        setAvailableUsers(availableUsers.filter(u => u.id !== userId));
        toast.success(`${userToAdd.name} adicionado ao grupo.`);
    } catch (err) {
        toast.error('Falha ao adicionar usuário.');
    }
  };

  const handleRemoveUser = async (userId) => {
    try {
        await apiClient.delete('/superadmin/groups/removeUser', { data: { userId, groupId: group.id } });
        const userToRemove = members.find(u => u.id === userId);
        setAvailableUsers([...availableUsers, userToRemove]);
        setMembers(members.filter(u => u.id !== userId));
        toast.success(`${userToRemove.name} removido do grupo.`);
    } catch (err) {
        toast.error('Falha ao remover usuário.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Gerenciar Membros: {group.name}</h2>
          <button onClick={onClose} className="modal-close-btn">&times;</button>
        </div>
        <div className="modal-body">
          {loading ? <p>Carregando...</p> : (
            <div className="members-management">
              <div className="user-list-container">
                <h3>Membros do Grupo ({members.length})</h3>
                <ul className="user-list">
                  {members.map(user => (
                    <li key={user.id}>
                      {user.name} ({user.email})
                      <button onClick={() => handleRemoveUser(user.id)} className="btn-remove">Remover</button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="user-list-container">
                <h3>Usuários Disponíveis ({availableUsers.length})</h3>
                <ul className="user-list">
                  {availableUsers.map(user => (
                    <li key={user.id}>
                      {user.name} ({user.email})
                      <button onClick={() => handleAddUser(user.id)} className="btn-add-user">Adicionar</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ManageMembersModal;