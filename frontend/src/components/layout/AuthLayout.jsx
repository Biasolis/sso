import { Outlet } from 'react-router-dom';
import './AuthLayout.css';

function AuthLayout() {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">SSO Project</h1>
        <Outlet /> {/* As páginas de Login e Cadastro serão renderizadas aqui */}
      </div>
    </div>
  );
}

export default AuthLayout;