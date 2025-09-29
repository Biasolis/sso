import { Link, Outlet } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import './AdminLayout.css';

function AdminLayout() {
  const { logout } = useAuth();

  return (
    <div className="admin-layout">
      <nav className="sidebar">
        <div>
            <h2>SSO Admin</h2>
            <ul>
            <li><Link to="/admin/dashboard">Dashboard</Link></li>
            <li><Link to="/admin/users">Usuários</Link></li>
            <li><Link to="/admin/groups">Grupos</Link></li>
            <li><Link to="/admin/clients">Clientes OAuth</Link></li> {/* Adicionado */}
            </ul>
        </div>
        <div>
            <button onClick={logout} className="logout-button">Sair</button>
        </div>
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;