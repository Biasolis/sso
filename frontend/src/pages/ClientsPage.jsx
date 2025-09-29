import { useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig';
import Modal from '../components/Modal';
import { toast } from 'react-hot-toast';
import './ClientsPage.css';

function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para os modais
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isCredentialsModalOpen, setCredentialsModalOpen] = useState(false);
  const [newClientCredentials, setNewClientCredentials] = useState(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/superadmin/clients');
      setClients(response.data);
    } catch (err) {
      toast.error('Falha ao buscar clientes.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const { client_name, redirect_uris } = e.target.elements;

    // Converte as URIs de redirect (separadas por vírgula) em um array
    const uris = redirect_uris.value.split(',').map(uri => uri.trim()).filter(uri => uri);

    if (uris.length === 0) {
      toast.error("Você deve fornecer pelo menos uma Redirect URI.");
      return;
    }
    
    const promise = apiClient.post('/superadmin/clients', {
      client_name: client_name.value,
      redirect_uris: uris,
    });

    toast.promise(promise, {
        loading: 'Criando cliente...',
        success: (response) => {
            setClients([...clients, response.data]);
            setNewClientCredentials(response.data); // Salva as credenciais para exibir
            setAddModalOpen(false); // Fecha o modal de adição
            setCredentialsModalOpen(true); // Abre o modal de credenciais
            return 'Cliente criado com sucesso!';
        },
        error: 'Falha ao criar o cliente.'
    });
  };

  const handleDeleteClient = async (clientId) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente? Todas as aplicações que o utilizam perderão o acesso.')) {
      try {
        await apiClient.delete(`/superadmin/clients/${clientId}`);
        setClients(clients.filter((client) => client.id !== clientId));
        toast.success('Cliente excluído com sucesso!');
      } catch (err) {
        toast.error('Falha ao excluir o cliente.');
        console.error(err);
      }
    }
  };

  if (loading) return <p>Carregando clientes...</p>;

  return (
    <div>
      <h1>Gerenciamento de Clientes OAuth</h1>
      <button className="btn-add" onClick={() => setAddModalOpen(true)}>Adicionar Cliente</button>
      <table className="clients-table">
        <thead>
          <tr>
            <th>Nome do Cliente</th>
            <th>Client ID</th>
            <th>Redirect URIs</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id}>
              <td>{client.client_name}</td>
              <td><code>{client.client_id}</code></td>
              <td>
                <ul>
                  {client.redirect_uris.map(uri => <li key={uri}><code>{uri}</code></li>)}
                </ul>
              </td>
              <td>
                <button className="btn-delete" onClick={() => handleDeleteClient(client.id)}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal de Adicionar Cliente */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setAddModalOpen(false)} 
        title="Adicionar Novo Cliente OAuth"
      >
        <form onSubmit={handleFormSubmit} className="client-form">
          <div className="form-group">
            <label htmlFor="client_name">Nome do Cliente:</label>
            <input id="client_name" type="text" placeholder="Minha Aplicação Web" required />
          </div>
          <div className="form-group">
            <label htmlFor="redirect_uris">Redirect URIs:</label>
            <textarea 
                id="redirect_uris" 
                placeholder="https://meuapp.com/callback, http://localhost:3000/callback" 
                rows="3" 
                required 
            />
            <small>Separe múltiplas URIs por vírgula.</small>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-save">Salvar</button>
            <button type="button" onClick={() => setAddModalOpen(false)} className="btn-cancel">Cancelar</button>
          </div>
        </form>
      </Modal>

      {/* Modal para Exibir Credenciais */}
      <Modal
        isOpen={isCredentialsModalOpen}
        onClose={() => setCredentialsModalOpen(false)}
        title="Credenciais do Cliente Geradas"
      >
        <div className="credentials-display">
            <p><strong>Atenção:</strong> Guarde o <strong>Client Secret</strong> em um lugar seguro. Ele não será exibido novamente!</p>
            <div className="credential-item">
                <label>Client ID:</label>
                <code>{newClientCredentials?.client_id}</code>
            </div>
            <div className="credential-item">
                <label>Client Secret:</label>
                <code>{newClientCredentials?.client_secret}</code>
            </div>
            <div className="form-actions">
                <button type="button" onClick={() => setCredentialsModalOpen(false)} className="btn-save">Entendi</button>
            </div>
        </div>
      </Modal>
    </div>
  );
}

export default ClientsPage;