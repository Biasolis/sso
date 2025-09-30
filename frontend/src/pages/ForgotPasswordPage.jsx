import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import apiClient from '../api/axiosConfig';

function ForgotPasswordPage() {

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        const { email } = e.target.elements;

        const promise = apiClient.post('/auth/forgot-password', { email: email.value });

        toast.promise(promise, {
            loading: 'A enviar pedido...',
            success: (response) => {
                return response.data.message; // Exibe a mensagem de sucesso do backend
            },
            error: 'Ocorreu um erro. Tente novamente mais tarde.'
        });
    };

    return (
        <div>
            <h2>Esqueceu a sua Palavra-passe?</h2>
            <p>Não há problema. Insira o seu e-mail abaixo e enviar-lhe-emos um link para redefinir a sua palavra-passe.</p>
            <form onSubmit={handleForgotPassword} className="auth-form">
                <div className="form-group">
                    <label htmlFor="email">Email:</label>
                    <input id="email" type="email" required />
                </div>
                <button type="submit" className="auth-button">Enviar Link de Redefinição</button>
            </form>
            <Link to="/login" className="auth-link">Voltar ao Login</Link>
        </div>
    );
}

export default ForgotPasswordPage;