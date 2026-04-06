import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Navigate to="/auth" replace />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/dashboard/admin"   element={<Dashboard />} />
                    <Route path="/dashboard/angajat" element={<Dashboard />} />
                    <Route path="/dashboard/calator" element={<Dashboard />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
