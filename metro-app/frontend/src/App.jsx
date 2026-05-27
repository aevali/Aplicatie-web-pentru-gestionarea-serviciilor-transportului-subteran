import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/dashboard/Dashboard';
import TouristPage from './pages/TouristPage';

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Navigate to="/auth" replace />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/tourist" element={<TouristPage />} />
                    <Route path="/dashboard/admin"   element={<Dashboard />} />
                    <Route path="/dashboard/angajat" element={<Dashboard />} />
                    <Route path="/dashboard/calator" element={<Dashboard />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
