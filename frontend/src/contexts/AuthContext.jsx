import { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const navigate = useNavigate();

  useEffect(() => {
    // Se temos um token, mas não temos dados do usuário (ex: após recarregar a página)
    // Poderíamos buscar os dados do usuário aqui. Por enquanto, vamos assumir
    // que o token é suficiente para considerar o usuário "logado".
    if (token) {
      // Opcional: decodificar o token para obter dados do usuário sem ir ao backend
      const userData = JSON.parse(localStorage.getItem('user'));
      setUser(userData);
    }
  }, [token]);

  const login = (userData) => {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('user', JSON.stringify(userData.user));
    setToken(userData.token);
    setUser(userData.user);
    navigate('/admin/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;