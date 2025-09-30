import { Link, Outlet } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import './AdminLayout.css';

function AdminLayout() {
  const { user, logout } = useAuth(); // Obter o utilizador para exibir o nome/email

  return (
    <div className="admin-layout">
      <nav className="sidebar">
        <div>
            <h2>SSO Admin</h2>
            <ul>
                <li><Link to="/admin/dashboard">Dashboard</Link></li>
                <li><Link to="/admin/users">Utilizadores</Link></li>
                <li><Link to="/admin/groups">Grupos</Link></li>
                <li><Link to="/admin/clients">Clientes OAuth</Link></li>
            </ul>
        </div>
        <div className="sidebar-footer">
            <div className="user-info">
                <strong>{user?.name}</strong>
                <small>{user?.email}</small>
            </div>
            <Link to="/admin/my-account" className="account-button">A Minha Conta</Link>
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