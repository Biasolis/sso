import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import apiClient from '../api/axiosConfig';

function SignupPage() {
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    const { name, email, password } = e.target.elements;

    const signupData = {
      name: name.value,
      email: email.value,
      password: password.value,
    };
    
    const promise = apiClient.post('/auth/signup', signupData);

    toast.promise(promise, {
        loading: 'A criar conta...',
        success: (response) => {
            // Apenas exibe a mensagem de sucesso, o utilizador deve ir ao e-mail
            return response.data.message;
        },
        error: (err) => {
            if (err.response && err.response.status === 409) {
                return 'Este email já está em uso.';
            }
            return 'Falha ao criar a conta.';
        }
    });
  };

  return (
    <div>
      <form onSubmit={handleSignup} className="auth-form">
        <div className="form-group">
            <label htmlFor="name">Nome:</label>
            <input id="name" type="text" required />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input id="email" type="email" required />
        </div>
        <div className="form-group">
          <label htmlFor="password">Palavra-passe:</label>
          <input id="password" type="password" required />
        </div>
        <button type="submit" className="auth-button">Registar</button>
      </form>
      <Link to="/login" className="auth-link">Já tem uma conta? Faça login</Link>
    </div>
  );
}

export default SignupPage;