import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import apiClient from '../api/axiosConfig';

function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const handleResetPassword = async (e) => {
        e.preventDefault();
        const { password, confirmPassword } = e.target.elements;

        if (password.value !== confirmPassword.value) {
            toast.error("As palavras-passe não coincidem.");
            return;
        }

        if (!token) {
            toast.error("Token de redefinição inválido ou em falta.");
            return;
        }

        const promise = apiClient.post('/auth/reset-password', {
            token,
            password: password.value,
        });

        toast.promise(promise, {
            loading: 'A redefinir palavra-passe...',
            success: () => {
                navigate('/login');
                return 'Palavra-passe redefinida com sucesso! Pode agora fazer login.';
            },
            error: (err) => {
                return err.response?.data?.message || 'Falha ao redefinir a palavra-passe.';
            }
        });
    };

    return (
        <div>
            <h2>Redefinir a sua Palavra-passe</h2>
            <form onSubmit={handleResetPassword} className="auth-form">
                <div className="form-group">
                    <label htmlFor="password">Nova Palavra-passe:</label>
                    <input id="password" type="password" required />
                </div>
                <div className="form-group">
                    <label htmlFor="confirmPassword">Confirme a Nova Palavra-passe:</label>
                    <input id="confirmPassword" type="password" required />
                </div>
                <button type="submit" className="auth-button">Redefinir Palavra-passe</button>
            </form>
        </div>
    );
}

export default ResetPasswordPage;