import { useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig';
import Modal from '../components/Modal';
import ManageMembersModal from '../components/ManageMembersModal';
import { toast } from 'react-hot-toast';
import './GroupsPage.css';

function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para os modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' ou 'edit'
  const [currentGroup, setCurrentGroup] = useState(null); // Para o grupo em edição

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
    const { name, ldap_dn } = e.target.elements;
    
    const groupData = {
        name: name.value,
        ldap_dn: ldap_dn.value || null // Envia null se o campo estiver vazio
    };

    const promise = modalMode === 'edit'
        ? apiClient.put(`/superadmin/groups/${currentGroup.id}`, groupData)
        : apiClient.post('/superadmin/groups', { name: groupData.name }); // A criação não envia ldap_dn

    toast.promise(promise, {
        loading: modalMode === 'edit' ? 'A atualizar grupo...' : 'A criar grupo...',
        success: (response) => {
            if (modalMode === 'edit') {
                setGroups(groups.map(g => g.id === currentGroup.id ? response.data : g));
            } else {
                setGroups([...groups, response.data]);
            }
            handleCloseModal();
            return `Grupo ${modalMode === 'edit' ? 'atualizado' : 'criado'} com sucesso!`;
        },
        error: `Falha ao ${modalMode === 'edit' ? 'atualizar' : 'criar'} o grupo.`
    });
  };

  const handleDeleteGroup = async (groupId) => {
    if (window.confirm('Tem a certeza que deseja excluir este grupo?')) {
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

  const handleAddClick = () => {
      setModalMode('add');
      setCurrentGroup(null);
      setIsModalOpen(true);
  };

  const handleEditClick = (group) => {
      setModalMode('edit');
      setCurrentGroup(group);
      setIsModalOpen(true);
  };

  const handleCloseModal = () => {
      setIsModalOpen(false);
      setCurrentGroup(null);
  };


  if (loading) return <p>A carregar grupos...</p>;

  return (
    <div>
      <h1>Gestão de Grupos</h1>
      <button className="btn-add" onClick={handleAddClick}>Adicionar Grupo</button>
      <table className="groups-table">
        <thead>
          <tr>
            <th>Nome do Grupo</th>
            <th>Mapeamento LDAP DN</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.id}>
              <td>{group.name}</td>
              <td>{group.ldap_dn ? <code>{group.ldap_dn}</code> : <span className="no-mapping">Nenhum</span>}</td>
              <td className="actions-cell">
                <button className="btn-edit" onClick={() => handleEditClick(group)}>Editar</button>
                <button className="btn-manage" onClick={() => handleManageMembersClick(group)}>Gerir Membros</button>
                <button className="btn-delete" onClick={() => handleDeleteGroup(group.id)}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal de Adicionar/Editar Grupo */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={modalMode === 'edit' ? 'Editar Grupo' : 'Adicionar Novo Grupo'}
      >
        <form onSubmit={handleFormSubmit} className="group-form">
          <div className="form-group">
            <label htmlFor="name">Nome do Grupo:</label>
            <input id="name" type="text" defaultValue={currentGroup?.name} required />
          </div>
          {/* O campo de mapeamento só aparece no modo de edição */}
          {modalMode === 'edit' && (
            <div className="form-group">
                <label htmlFor="ldap_dn">Mapeamento LDAP DN (Opcional):</label>
                <input id="ldap_dn" type="text" defaultValue={currentGroup?.ldap_dn} placeholder="cn=GroupName,cn=Users,dc=domain,dc=com" />
                <small>Preencha para sincronizar este grupo com um grupo do Active Directory.</small>
            </div>
          )}
          <div className="form-actions">
            <button type="submit" className="btn-save">Salvar</button>
            <button type="button" onClick={handleCloseModal} className="btn-cancel">Cancelar</button>
          </div>
        </form>
      </Modal>

      {/* Modal de Gerir Membros */}
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