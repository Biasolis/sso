import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext'; // Importar
import ProtectedRoute from './components/ProtectedRoute'; // Importar
import AdminLayout from './components/layout/AdminLayout';
import AuthLayout from './components/layout/AuthLayout';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import GroupsPage from './pages/GroupsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

function HomePage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Página Inicial SSO</h1>
      <p>Esta é a página pública. O painel de admin está em <code>/admin/dashboard</code>.</p>
      <p>Acesse a página de <a href="/login">login</a>.</p>
    </div>
  );
}

function App() {
  return (
    <AuthProvider> {/* Envolver tudo com o AuthProvider */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        {/* Rotas Protegidas do Painel de Admin */}
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="groups" element={<GroupsPage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;