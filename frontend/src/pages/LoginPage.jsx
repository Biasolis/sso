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
        
        // Passa os dados do usuário (incluindo o token) para a função de login do contexto
        login(response.data);

        // Verifica se há parâmetros OAuth na URL para continuar o fluxo
        const clientId = searchParams.get('client_id');
        if (clientId) {
            // Reconstrói a URL de consentimento com os parâmetros originais
            const consentUrl = new URL('/consent', window.location.origin);
            searchParams.forEach((value, key) => {
                consentUrl.searchParams.append(key, value);
            });
            // O token do usuário será pego pelo AuthContext e injetado na requisição pelo axios
            navigate(consentUrl.pathname + consentUrl.search);
        } else {
            // Se não for um fluxo OAuth, vai para o dashboard
            navigate('/admin/dashboard');
        }

    } catch (error) {
        toast.error('Credenciais inválidas. Verifique seu email e senha.');
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
          <label htmlFor="password">Senha:</label>
          <input id="password" type="password" required />
        </div>
        <button type="submit" className="auth-button">Entrar</button>
      </form>
      <Link to="/signup" className="auth-link">Não tem uma conta? Cadastre-se</Link>
    </div>
  );
}

export default LoginPage;