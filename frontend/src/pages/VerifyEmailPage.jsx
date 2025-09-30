import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiClient from '../api/axiosConfig';

function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
    const [message, setMessage] = useState('A verificar o seu e-mail...');
    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Token de verificação inválido ou em falta.');
            return;
        }

        const verifyToken = async () => {
            try {
                const response = await apiClient.post('/auth/verify-email', { token });
                setStatus('success');
                setMessage(response.data.message);
            } catch (error) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Ocorreu um erro ao verificar o seu e-mail.');
            }
        };

        verifyToken();
    }, [token]);

    return (
        <div>
            <h2>Verificação de E-mail</h2>
            <p className={`verification-status ${status}`}>
                {message}
            </p>
            {status === 'success' && (
                <Link to="/login" className="auth-link">Continuar para o Login</Link>
            )}
        </div>
    );
}

export default VerifyEmailPage;