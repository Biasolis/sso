import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import apiClient from '../api/axiosConfig';
import useAuth from '../hooks/useAuth';
import './ConsentPage.css';

function ConsentPage() {
  const [searchParams] = useSearchParams();
  const { user, token } = useAuth();

  // Extrai todos os parâmetros da URL
  const client_id = searchParams.get('client_id');
  const redirect_uri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const response_type = searchParams.get('response_type');
  
  const handleConsent = async (approved) => {
    if (!approved) {
      // Se o usuário negar, redirecionamos de volta com um erro
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.append('error', 'access_denied');
      if (state) {
        redirectUrl.searchParams.append('state', state);
      }
      window.location.href = redirectUrl.toString();
      return;
    }

    try {
      const response = await apiClient.post('/oauth/approve', {
        client_id,
        redirect_uri,
        state,
        user_token: token, // Envia o token do usuário logado para o backend
      });
      
      // Redireciona o browser do usuário para a URL de callback do cliente
      window.location.href = response.data.redirectUrl;

    } catch (error) {
      toast.error('Ocorreu um erro ao processar sua autorização.');
      console.error(error);
    }
  };

  if (!user) {
    return <p>Você precisa estar logado para dar consentimento.</p>;
  }

  return (
    <div className="consent-container">
      <div className="consent-card">
        <h2 className="consent-title">Autorizar Aplicação</h2>
        <p>A aplicação <strong>{client_id}</strong> está a solicitar permissão para aceder à sua identidade.</p>
        <p>Isto irá permitir que a aplicação o identifique e aceda a informações básicas do seu perfil, como o seu nome e email.</p>
        <div className="consent-actions">
          <button onClick={() => handleConsent(false)} className="consent-button deny">
            Negar
          </button>
          <button onClick={() => handleConsent(true)} className="consent-button approve">
            Permitir
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConsentPage;