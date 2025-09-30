import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import apiClient from '../api/axiosConfig';
import useAuth from '../hooks/useAuth';
import './DashboardPage.css';

// Componente para o Dashboard do Superadmin
function AdminDashboard() {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                setLoading(true);
                const response = await apiClient.get('/superadmin/dashboard/metrics');
                setMetrics(response.data);
            } catch (error) {
                toast.error('Falha ao carregar as métricas do dashboard.');
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchMetrics();
    }, []);

    if (loading) {
        return <p>A carregar métricas...</p>;
    }

    return (
        <div className="dashboard-admin">
            <h1>Dashboard do Administrador</h1>
            <div className="metrics-grid">
                <div className="metric-card">
                    <h2>Total de Utilizadores</h2>
                    <p>{metrics?.totalUsers}</p>
                </div>
                <div className="metric-card">
                    <h2>Total de Clientes OAuth</h2>
                    <p>{metrics?.totalClients}</p>
                </div>
                <div className="metric-card">
                    <h2>Total de Grupos</h2>
                    <p>{metrics?.totalGroups}</p>
                </div>
            </div>

            <h2>Últimos Acessos via SSO</h2>
            <table className="logs-table">
                <thead>
                    <tr>
                        <th>Utilizador</th>
                        <th>Aplicação</th>
                        <th>Data e Hora</th>
                    </tr>
                </thead>
                <tbody>
                    {metrics?.recentLogins.map(log => (
                        <tr key={log.id}>
                            <td>{log.user_name} ({log.user_email})</td>
                            <td>{log.client_name}</td>
                            <td>{new Date(log.created_at).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// Componente para o Dashboard do Utilizador Normal
function UserDashboard() {
    const { user } = useAuth();
    return (
        <div className="dashboard-user">
            <h1>Bem-vindo ao SSO</h1>
            <p>Olá, <strong>{user?.name}</strong>!</p>
            <p>Está autenticado com sucesso no nosso serviço de Single Sign-On.</p>
            <p>Pode fechar esta janela e voltar para a sua aplicação.</p>
        </div>
    );
}


// Componente principal da página que decide qual dashboard renderizar
function DashboardPage() {
  const { user } = useAuth();

  return user?.is_superadmin ? <AdminDashboard /> : <UserDashboard />;
}

export default DashboardPage;