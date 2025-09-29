import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';
import AuthLayout from './components/layout/AuthLayout';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import GroupsPage from './pages/GroupsPage';
import ClientsPage from './pages/ClientsPage'; // Importar
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ConsentPage from './pages/ConsentPage';

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
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>
        
        <Route element={<ProtectedRoute />}>
            <Route path="/consent" element={<ConsentPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="groups" element={<GroupsPage />} />
            <Route path="clients" element={<ClientsPage />} /> {/* Adicionado */}
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;