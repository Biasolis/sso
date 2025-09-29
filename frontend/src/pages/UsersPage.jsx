import { useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig';
import Modal from '../components/Modal';
import { toast } from 'react-hot-toast'; // Importar toast
import './UsersPage.css';

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // O estado de erro foi removido, usaremos toasts

  // Estados para o modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [modalMode, setModalMode] = useState('add');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/superadmin/users');
      setUsers(response.data);
    } catch (err) {
      toast.error('Falha ao buscar usuários.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await apiClient.delete(`/superadmin/users/${userId}`);
        setUsers(users.filter((user) => user.id !== userId));
        toast.success('Usuário excluído com sucesso!');
      } catch (err) {
        toast.error('Falha ao excluir o usuário.');
        console.error(err);
      }
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
        loading: 'Salvando...',
        success: (response) => {
            if (modalMode === 'edit') {
                setUsers(users.map(user => user.id === currentUser.id ? response.data : user));
            } else {
                setUsers([...users, response.data]);
            }
            handleCloseModal();
            return `Usuário ${modalMode === 'edit' ? 'atualizado' : 'criado'} com sucesso!`;
        },
        error: `Falha ao ${modalMode === 'edit' ? 'atualizar' : 'criar'} o usuário.`
    });
  };

  if (loading) return <p>Carregando usuários...</p>;

  return (
    <div>
      <h1>Gerenciamento de Usuários</h1>
      <button className="btn-add" onClick={handleAddClick}>Adicionar Usuário</button>
      <table className="users-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Data de Criação</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{new Date(user.created_at).toLocaleDateString()}</td>
              <td>
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
        title={modalMode === 'edit' ? 'Editar Usuário' : 'Adicionar Usuário'}
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
            <label htmlFor="password">Senha:</label>
            <input 
              id="password" 
              type="password" 
              placeholder={modalMode === 'edit' ? 'Deixe em branco para não alterar' : ''}
              required={modalMode === 'add'} 
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-save">Salvar</button>
            <button type="button" onClick={handleCloseModal} className="btn-cancel">Cancelar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default UsersPage;