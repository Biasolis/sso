import { useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig';
import Modal from '../components/Modal';
import ManageMembersModal from '../components/ManageMembersModal';
import { toast } from 'react-hot-toast'; // Importar toast
import './GroupsPage.css';

function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isManageModalOpen, setManageModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/superadmin/groups');
      setGroups(response.data);
    } catch (err) {
      toast.error('Falha ao buscar grupos.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);
  
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const { name } = e.target.elements;
    
    const promise = apiClient.post('/superadmin/groups', { name: name.value });

    toast.promise(promise, {
        loading: 'Criando grupo...',
        success: (response) => {
            setGroups([...groups, response.data]);
            setAddModalOpen(false);
            return 'Grupo criado com sucesso!';
        },
        error: 'Falha ao criar o grupo.'
    });
  };

  const handleDeleteGroup = async (groupId) => {
    if (window.confirm('Tem certeza que deseja excluir este grupo?')) {
      try {
        await apiClient.delete(`/superadmin/groups/${groupId}`);
        setGroups(groups.filter((group) => group.id !== groupId));
        toast.success('Grupo excluído com sucesso!');
      } catch (err) {
        toast.error('Falha ao excluir o grupo.');
        console.error(err);
      }
    }
  };

  const handleManageMembersClick = (group) => {
    setSelectedGroup(group);
    setManageModalOpen(true);
  };

  if (loading) return <p>Carregando grupos...</p>;

  return (
    <div>
      <h1>Gerenciamento de Grupos</h1>
      <button className="btn-add" onClick={() => setAddModalOpen(true)}>Adicionar Grupo</button>
      <table className="groups-table">
        <thead>
          <tr>
            <th>Nome do Grupo</th>
            <th>Data de Criação</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.id}>
              <td>{group.name}</td>
              <td>{new Date(group.created_at).toLocaleDateString()}</td>
              <td className="actions-cell">
                <button className="btn-manage" onClick={() => handleManageMembersClick(group)}>Gerenciar Membros</button>
                <button className="btn-delete" onClick={() => handleDeleteGroup(group.id)}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setAddModalOpen(false)} 
        title="Adicionar Novo Grupo"
      >
        <form onSubmit={handleFormSubmit} className="group-form">
          <div className="form-group">
            <label htmlFor="name">Nome do Grupo:</label>
            <input id="name" type="text" required />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-save">Salvar</button>
            <button type="button" onClick={() => setAddModalOpen(false)} className="btn-cancel">Cancelar</button>
          </div>
        </form>
      </Modal>

      {selectedGroup && (
        <ManageMembersModal 
            isOpen={isManageModalOpen}
            onClose={() => setManageModalOpen(false)}
            group={selectedGroup}
        />
      )}
    </div>
  );
}

export default GroupsPage;