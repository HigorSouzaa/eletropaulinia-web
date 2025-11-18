import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { OrderProvider } from './contexts/OrderContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Ordens } from './pages/Dashboard';
import { NovaOrdem } from './pages/NovaOrdem';
import { EditarOrdem } from './pages/EditarOrdem';
import { WhatsAppPage } from './components/WhatsApp/WhatsAppPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OrderProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/ordens"
              element={
                <ProtectedRoute>
                  <Ordens />
                </ProtectedRoute>
              }
            />
            <Route
              path="/nova-ordem"
              element={
                <ProtectedRoute>
                  <NovaOrdem />
                </ProtectedRoute>
              }
            />
            <Route
              path="/editar-ordem/:id"
              element={
                <ProtectedRoute>
                  <EditarOrdem />
                </ProtectedRoute>
              }
            />
            <Route
              path="/whatsapp-chat"
              element={
                <ProtectedRoute>
                  <WhatsAppPage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/ordens" replace />} />
          </Routes>
        </OrderProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;