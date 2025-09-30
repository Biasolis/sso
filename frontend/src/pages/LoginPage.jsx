import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import apiClient from '../api/axiosConfig';
import useAuth from '../hooks/useAuth';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleLogin = async (e) => {
    e.preventDefault();
    const { email, password } = e.target.elements;
    
    const loginData = {
      email: email.value,
      password: password.value,
    };

    try {
        const response = await apiClient.post('/auth/login', loginData);
        toast.success('Login realizado com sucesso!');
        
        login(response.data);

        const clientId = searchParams.get('client_id');
        if (clientId) {
            const consentUrl = new URL('/consent', window.location.origin);
            searchParams.forEach((value, key) => {
                consentUrl.searchParams.append(key, value);
            });
            navigate(consentUrl.pathname + consentUrl.search);
        } else {
            navigate('/admin/dashboard');
        }

    } catch (error) {
        toast.error('Credenciais inválidas. Verifique o seu email e palavra-passe.');
        console.error(error);
    }
  };

  return (
    <div>
      <form onSubmit={handleLogin} className="auth-form">
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input id="email" type="email" required />
        </div>
        <div className="form-group">
          <label htmlFor="password">Palavra-passe:</label>
          <input id="password" type="password" required />
        </div>
        <div className="form-group" style={{ textAlign: 'right' }}>
            <Link to="/forgot-password" className="auth-link-inline">Esqueceu a sua palavra-passe?</Link>
        </div>
        <button type="submit" className="auth-button">Entrar</button>
      </form>
      <Link to="/signup" className="auth-link">Não tem uma conta? Registe-se</Link>
    </div>
  );
}

export default LoginPage;