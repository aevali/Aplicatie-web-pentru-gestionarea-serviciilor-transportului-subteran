import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

export default function AuthPage() {
    const [tab, setTab] = useState('login'); // 'login' | 'register'
    const navigate = useNavigate();
    const { login } = useAuth();

    // ── Login state ──
    const [loginForm, setLoginForm] = useState({ email: '', parola: '' });
    const [loginEroare, setLoginEroare] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    // ── Register state ──
    const [regForm, setRegForm] = useState({
        nume: '', prenume: '', email: '', cnp: '',
        tip: 'adult', parola: '', confirmare_parola: '',
    });
    const [regEroare, setRegEroare] = useState('');
    const [regLoading, setRegLoading] = useState(false);
    const [regSuccess, setRegSuccess] = useState('');

    // ── Handlers login ──
    const handleLoginChange = (e) =>
        setLoginForm({ ...loginForm, [e.target.name]: e.target.value });

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginEroare('');
        setLoginLoading(true);
        try {
            const { data } = await axios.post('http://localhost:5000/api/auth/login', loginForm);
            login(data.token, data.user, data.tip_cont);

            if (data.tip_cont === 'angajat' && data.user.rol === 'admin') {
                navigate('/dashboard/admin');
            } else if (data.tip_cont === 'angajat') {
                navigate('/dashboard/angajat');
            } else {
                navigate('/dashboard/calator');
            }
        } catch (err) {
            setLoginEroare(err.response?.data?.mesaj || 'Eroare la autentificare.');
        } finally {
            setLoginLoading(false);
        }
    };

    // ── Handlers register ──
    const handleRegChange = (e) =>
        setRegForm({ ...regForm, [e.target.name]: e.target.value });

    const handleRegister = async (e) => {
        e.preventDefault();
        setRegEroare('');
        setRegSuccess('');

        if (regForm.parola !== regForm.confirmare_parola) {
            return setRegEroare('Parolele nu coincid.');
        }
        if (regForm.parola.length < 8) {
            return setRegEroare('Parola trebuie sa aiba minim 8 caractere.');
        }
        if (!/^\d{13}$/.test(regForm.cnp)) {
            return setRegEroare('CNP-ul trebuie sa contina exact 13 cifre.');
        }

        setRegLoading(true);
        try {
            await axios.post('http://localhost:5000/api/auth/register', regForm);
            // After register → switch to login with success message
            setRegForm({ nume: '', prenume: '', email: '', cnp: '', tip: 'adult', parola: '', confirmare_parola: '' });
            setTab('login');
            setLoginForm({ email: regForm.email, parola: '' });
            setLoginEroare('');
            // Show success banner on login tab
            setTimeout(() => setRegSuccess('Cont creat cu succes! Autentifică-te pentru a continua.'), 50);
        } catch (err) {
            setRegEroare(err.response?.data?.mesaj || 'Eroare la inregistrare.');
        } finally {
            setRegLoading(false);
        }
    };

    const switchTab = (t) => {
        setTab(t);
        setLoginEroare('');
        setRegEroare('');
        if (t !== 'login') setRegSuccess('');
    };

    return (
        <div className="auth-page">
            {/* Animated orbs */}
            <div className="auth-orb auth-orb-1" />
            <div className="auth-orb auth-orb-2" />
            <div className="auth-orb auth-orb-3" />

            {/* Moving metro dots */}
            <div className="auth-dots">
                <div className="auth-dot" />
                <div className="auth-dot" />
                <div className="auth-dot" />
                <div className="auth-dot" />
                <div className="auth-dot" />
            </div>

            <div className="auth-card">
                {/* Logo / titlu */}
                <div className="auth-header">
                    <div className="auth-logo">🚇</div>
                    <h1 className="auth-title">Metrou București</h1>
                    <p className="auth-subtitle">Sistemul de management al transportului</p>
                </div>

                {/* Tab-uri */}
                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
                        onClick={() => switchTab('login')}
                    >
                        Autentificare
                    </button>
                    <button
                        className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
                        onClick={() => switchTab('register')}
                    >
                        Înregistrare
                    </button>
                </div>

                {/* ── FORM LOGIN ── */}
                {tab === 'login' && (
                    <form className="auth-form" onSubmit={handleLogin}>
                        {regSuccess && <p className="auth-success">✅ {regSuccess}</p>}
                        <div className="form-group">
                            <label htmlFor="login-email">Email</label>
                            <input
                                id="login-email"
                                type="email"
                                name="email"
                                placeholder="exemplu@email.ro"
                                value={loginForm.email}
                                onChange={handleLoginChange}
                                required
                                autoComplete="email"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="login-parola">Parolă</label>
                            <input
                                id="login-parola"
                                type="password"
                                name="parola"
                                placeholder="••••••••"
                                value={loginForm.parola}
                                onChange={handleLoginChange}
                                required
                                autoComplete="current-password"
                            />
                        </div>
                        {loginEroare && <p className="auth-eroare">{loginEroare}</p>}
                        <button className="auth-btn" type="submit" disabled={loginLoading}>
                            {loginLoading ? 'Se autentifică...' : 'Autentificare'}
                        </button>
                    </form>
                )}

                {/* ── FORM REGISTER ── */}
                {tab === 'register' && (
                    <form className="auth-form" onSubmit={handleRegister}>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="reg-nume">Nume</label>
                                <input
                                    id="reg-nume"
                                    type="text"
                                    name="nume"
                                    placeholder="Popescu"
                                    value={regForm.nume}
                                    onChange={handleRegChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="reg-prenume">Prenume</label>
                                <input
                                    id="reg-prenume"
                                    type="text"
                                    name="prenume"
                                    placeholder="Ion"
                                    value={regForm.prenume}
                                    onChange={handleRegChange}
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="reg-email">Email</label>
                            <input
                                id="reg-email"
                                type="email"
                                name="email"
                                placeholder="exemplu@email.ro"
                                value={regForm.email}
                                onChange={handleRegChange}
                                required
                                autoComplete="email"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="reg-cnp">CNP</label>
                            <input
                                id="reg-cnp"
                                type="text"
                                name="cnp"
                                placeholder="1234567890123"
                                value={regForm.cnp}
                                onChange={handleRegChange}
                                maxLength={13}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="reg-tip">Tip călător</label>
                            <select
                                id="reg-tip"
                                name="tip"
                                value={regForm.tip}
                                onChange={handleRegChange}
                            >
                                <option value="adult">Adult</option>
                                <option value="elev">Elev</option>
                                <option value="student">Student</option>
                                <option value="pensionar">Pensionar</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="reg-parola">Parolă</label>
                            <input
                                id="reg-parola"
                                type="password"
                                name="parola"
                                placeholder="minim 8 caractere"
                                value={regForm.parola}
                                onChange={handleRegChange}
                                required
                                autoComplete="new-password"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="reg-confirmare">Confirmă parola</label>
                            <input
                                id="reg-confirmare"
                                type="password"
                                name="confirmare_parola"
                                placeholder="••••••••"
                                value={regForm.confirmare_parola}
                                onChange={handleRegChange}
                                required
                                autoComplete="new-password"
                            />
                        </div>
                        {regEroare && <p className="auth-eroare">{regEroare}</p>}
                        <button className="auth-btn" type="submit" disabled={regLoading}>
                            {regLoading ? 'Se creează contul...' : 'Creează cont'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
