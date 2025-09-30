import { useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig';
import Modal from '../components/Modal';
import { toast } from 'react-hot-toast';
import './UsersPage.css';

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [modalMode, setModalMode] = useState('add');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/superadmin/users');
      setUsers(response.data);
    } catch (err) { // CORRIGIDO: Adicionadas chavetas
      toast.error('Falha ao buscar utilizadores.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Tem a certeza que deseja excluir este utilizador?')) {
      try {
        await apiClient.delete(`/superadmin/users/${userId}`);
        setUsers(users.filter((user) => user.id !== userId));
        toast.success('Utilizador excluído com sucesso!');
      } catch (err) {
        toast.error('Falha ao excluir o utilizador.');
        console.error(err);
      }
    }
  };

  const handlePromoteUser = async (userId) => {
      if (window.confirm('Deseja dar privilégios de Superadmin a este utilizador? Esta ação não pode ser desfeita pela interface.')) {
          const promise = apiClient.post(`/superadmin/users/${userId}/promote`);
          toast.promise(promise, {
              loading: 'A promover...',
              success: (response) => {
                  setUsers(users.map(u => u.id === userId ? response.data : u));
                  return 'Utilizador promovido com sucesso!';
              },
              error: 'Falha ao promover o utilizador.'
          });
      }
  };

  const handleVerifyUser = async (userId) => {
      if (window.confirm('Deseja verificar manualmente o e-mail deste utilizador?')) {
          const promise = apiClient.post(`/superadmin/users/${userId}/verify`);
          toast.promise(promise, {
              loading: 'A verificar...',
              success: (response) => {
                  setUsers(users.map(u => u.id === userId ? response.data : u));
                  return 'Utilizador verificado com sucesso!';
              },
              error: 'Falha ao verificar o utilizador.'
          });
      }
  };

  const handleAddClick = () => {
    setModalMode('add');
    setCurrentUser(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (user) => {
    setModalMode('edit');
    setCurrentUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentUser(null);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password } = e.target.elements;
    
    const userData = {
      name: name.value,
      email: email.value,
      password: password.value,
    };

    const promise = modalMode === 'edit'
      ? apiClient.put(`/superadmin/users/${currentUser.id}`, userData)
      : apiClient.post('/superadmin/users', userData);

    toast.promise(promise, {
        loading: 'A guardar...',
        success: (response) => {
            if (modalMode === 'edit') {
                setUsers(users.map(user => user.id === currentUser.id ? response.data : user));
            } else {
                setUsers([...users, response.data]);
            }
            handleCloseModal();
            return `Utilizador ${modalMode === 'edit' ? 'atualizado' : 'criado'} com sucesso!`;
        },
        error: `Falha ao ${modalMode === 'edit' ? 'atualizar' : 'criar'} o utilizador.`
    });
  };

  if (loading) return <p>A carregar utilizadores...</p>;

  return (
    <div>
      <h1>Gestão de Utilizadores</h1>
      <button className="btn-add" onClick={handleAddClick}>Adicionar Utilizador</button>
      <table className="users-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Status (Admin)</th>
            <th>Status (Verificação)</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>
                {user.is_superadmin ? <span className="status-admin">Superadmin</span> : 'Utilizador'}
              </td>
              <td>
                {user.is_verified ? <span className="status-verified">Verificado</span> : <span className="status-pending">Pendente</span>}
              </td>
              <td className="actions-cell">
                {!user.is_verified && (
                    <button className="btn-verify" onClick={() => handleVerifyUser(user.id)}>Verificar</button>
                )}
                {!user.is_superadmin && (
                    <button className="btn-promote" onClick={() => handlePromoteUser(user.id)}>Promover</button>
                )}
                <button className="btn-edit" onClick={() => handleEditClick(user)}>Editar</button>
                <button className="btn-delete" onClick={() => handleDeleteUser(user.id)}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={modalMode === 'edit' ? 'Editar Utilizador' : 'Adicionar Utilizador'}
      >
        <form onSubmit={handleFormSubmit} className="user-form">
          <div className="form-group">
            <label htmlFor="name">Nome:</label>
            <input id="name" type="text" defaultValue={currentUser?.name} required />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input id="email" type="email" defaultValue={currentUser?.email} required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Palavra-passe:</label>
            <input 
              id="password" 
              type="password" 
              placeholder={modalMode === 'edit' ? 'Deixe em branco para não alterar' : ''}
              required={modalMode === 'add'} 
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-save">Guardar</button>
            <button type="button" onClick={handleCloseModal} className="btn-cancel">Cancelar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
} // CORRIGIDO: Trocado ')' por '}' para fechar a função

export default UsersPage;