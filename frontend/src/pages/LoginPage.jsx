import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import apiClient from '../api/axiosConfig';
import useAuth from '../hooks/useAuth'; // Importar

function LoginPage() {
  const { login } = useAuth(); // Usar o hook
  const navigate = useNavigate();

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
        login(response.data); // Chamar a função de login do contexto
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