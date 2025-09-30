import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import apiClient from '../api/axiosConfig';
import useAuth from '../hooks/useAuth';
import './ConsentPage.css';

// Mapeia os nomes dos escopos para descrições mais amigáveis
const scopeDescriptions = {
  openid: 'Confirmar a sua identidade.',
  profile: 'Aceder às informações básicas do seu perfil (nome).',
  email: 'Aceder ao seu endereço de e-mail.',
};

function ConsentPage() {
  const [searchParams] = useSearchParams();
  const { user, token } = useAuth();

  const client_id = searchParams.get('client_id');
  const redirect_uri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const scope = searchParams.get('scope') || '';
  const requestedScopes = scope.split(' ');

  const handleConsent = async (approved) => {
    if (!approved) {
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
        user_token: token,
        scopes: requestedScopes, // Envia os escopos aprovados para o backend
      });
      
      window.location.href = response.data.redirectUrl;

    } catch (error) {
      toast.error('Ocorreu um erro ao processar a sua autorização.');
      console.error(error);
    }
  };

  if (!user) {
    return <p>Precisa de estar autenticado para dar consentimento.</p>;
  }

  return (
    <div className="consent-container">
      <div className="consent-card">
        <h2 className="consent-title">Autorizar Aplicação</h2>
        <p>A aplicação <strong>{client_id}</strong> está a solicitar permissão para:</p>
        <ul className="scopes-list">
            {requestedScopes.map(s => (
                <li key={s}>{scopeDescriptions[s] || s}</li>
            ))}
        </ul>
        <p>Ao permitir, a aplicação poderá aceder a estas informações.</p>
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