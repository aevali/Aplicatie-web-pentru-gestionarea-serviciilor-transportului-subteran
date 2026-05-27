import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AuthPage() {
    const [view, setView] = useState('login'); // 'login' | 'register'
    const navigate = useNavigate();
    const { login } = useAuth();

    // ── Login state ──
    const [loginForm, setLoginForm] = useState({ email: '', parola: '' });
    const [loginEroare, setLoginEroare] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [showLoginParola, setShowLoginParola] = useState(false);

    // ── Register state ──
    const [regForm, setRegForm] = useState({
        nume: '', prenume: '', email: '', cnp: '',
        tip: 'adult', parola: '', confirmare_parola: '',
    });
    const [regEroare, setRegEroare] = useState('');
    const [regLoading, setRegLoading] = useState(false);
    const [regSuccess, setRegSuccess] = useState('');
    const [showRegParola, setShowRegParola] = useState(false);
    const [showRegConfirmare, setShowRegConfirmare] = useState(false);

    // ── Eye icon SVG ──
    const EyeIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );

    const EyeOffIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    );

    // ── Handlers login ──
    const handleLoginChange = (e) =>
        setLoginForm({ ...loginForm, [e.target.name]: e.target.value });

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginEroare('');
        setLoginLoading(true);
        try {
            const { data } = await axios.post(`${API}/api/auth/login`, loginForm);
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
            await axios.post(`${API}/api/auth/register`, regForm);
            setRegForm({ nume: '', prenume: '', email: '', cnp: '', tip: 'adult', parola: '', confirmare_parola: '' });
            setView('login');
            setLoginForm({ email: regForm.email, parola: '' });
            setLoginEroare('');
            setTimeout(() => setRegSuccess('Cont creat cu succes! Autentifică-te pentru a continua.'), 50);
        } catch (err) {
            setRegEroare(err.response?.data?.mesaj || 'Eroare la inregistrare.');
        } finally {
            setRegLoading(false);
        }
    };

    const switchView = (v) => {
        setView(v);
        setLoginEroare('');
        setRegEroare('');
        if (v !== 'login') setRegSuccess('');
    };

    return (
        <div className="auth-page">
            {/* Metro line stripe at top */}
            <div className="auth-metro-stripe" />

            {/* Subtle background pattern */}
            <div className="auth-bg-pattern" />

            <div className="auth-container">
                {/* Card */}
                <div className="auth-card">
                    {/* Header */}
                    <div className="auth-header">
                        <div className="auth-logo-wrap">
                            <div className="auth-logo-icon">M</div>
                        </div>
                        <h1 className="auth-title">MetroBucurești</h1>
                        <p className="auth-subtitle">
                            {view === 'login'
                                ? 'Accesează portalul de management'
                                : 'Creează un cont nou de călător'}
                        </p>
                    </div>

                    {/* ── FORM LOGIN ── */}
                    {view === 'login' && (
                        <form className="auth-form" onSubmit={handleLogin}>
                            {regSuccess && (
                                <div className="auth-alert auth-alert--success">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                                    </svg>
                                    {regSuccess}
                                </div>
                            )}

                            <div className="form-group">
                                <label htmlFor="login-email">Email</label>
                                <div className="input-wrap">
                                    <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                    </svg>
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
                            </div>

                            <div className="form-group">
                                <label htmlFor="login-parola">Parolă</label>
                                <div className="input-wrap">
                                    <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    <input
                                        id="login-parola"
                                        type={showLoginParola ? 'text' : 'password'}
                                        name="parola"
                                        placeholder="••••••••"
                                        value={loginForm.parola}
                                        onChange={handleLoginChange}
                                        required
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="eye-toggle"
                                        onClick={() => setShowLoginParola(v => !v)}
                                        aria-label={showLoginParola ? 'Ascunde parola' : 'Arată parola'}
                                    >
                                        {showLoginParola ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                            </div>

                            {loginEroare && <p className="auth-alert auth-alert--error">{loginEroare}</p>}

                            <button className="auth-btn" type="submit" disabled={loginLoading}>
                                {loginLoading ? (
                                    <><span className="auth-spinner" /> Se autentifică...</>
                                ) : 'Autentificare'}
                            </button>

                            <p className="auth-switch">
                                Nu ai cont?{' '}
                                <button type="button" className="auth-switch-link" onClick={() => switchView('register')}>
                                    Creează-ți unul
                                </button>
                            </p>

                            <p className="auth-switch auth-switch--tourist">
                                🌍{' '}
                                <button type="button" className="auth-switch-link auth-tourist-link" onClick={() => navigate('/tourist')}>
                                    I'm a Tourist!
                                </button>
                            </p>
                        </form>
                    )}

                    {/* ── FORM REGISTER ── */}
                    {view === 'register' && (
                        <form className="auth-form" onSubmit={handleRegister}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="reg-nume">Nume</label>
                                    <div className="input-wrap">
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
                                </div>
                                <div className="form-group">
                                    <label htmlFor="reg-prenume">Prenume</label>
                                    <div className="input-wrap">
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
                            </div>

                            <div className="form-group">
                                <label htmlFor="reg-email">Email</label>
                                <div className="input-wrap">
                                    <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                    </svg>
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
                            </div>

                            <div className="form-group">
                                <label htmlFor="reg-cnp">CNP</label>
                                <div className="input-wrap">
                                    <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 10h20" /><path d="M6 14h2" /><path d="M12 14h6" />
                                    </svg>
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
                            </div>

                            <div className="form-group">
                                <label htmlFor="reg-tip">Tip călător</label>
                                <div className="input-wrap">
                                    <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                                    </svg>
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
                            </div>

                            <div className="form-group">
                                <label htmlFor="reg-parola">Parolă</label>
                                <div className="input-wrap">
                                    <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    <input
                                        id="reg-parola"
                                        type={showRegParola ? 'text' : 'password'}
                                        name="parola"
                                        placeholder="minim 8 caractere"
                                        value={regForm.parola}
                                        onChange={handleRegChange}
                                        required
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className="eye-toggle"
                                        onClick={() => setShowRegParola(v => !v)}
                                        aria-label={showRegParola ? 'Ascunde parola' : 'Arată parola'}
                                    >
                                        {showRegParola ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="reg-confirmare">Confirmă parola</label>
                                <div className="input-wrap">
                                    <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    <input
                                        id="reg-confirmare"
                                        type={showRegConfirmare ? 'text' : 'password'}
                                        name="confirmare_parola"
                                        placeholder="••••••••"
                                        value={regForm.confirmare_parola}
                                        onChange={handleRegChange}
                                        required
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className="eye-toggle"
                                        onClick={() => setShowRegConfirmare(v => !v)}
                                        aria-label={showRegConfirmare ? 'Ascunde parola' : 'Arată parola'}
                                    >
                                        {showRegConfirmare ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                            </div>

                            {regEroare && <p className="auth-alert auth-alert--error">{regEroare}</p>}

                            <button className="auth-btn" type="submit" disabled={regLoading}>
                                {regLoading ? (
                                    <><span className="auth-spinner" /> Se creează contul...</>
                                ) : 'Creează cont'}
                            </button>

                            <p className="auth-switch">
                                Ai deja cont?{' '}
                                <button type="button" className="auth-switch-link" onClick={() => switchView('login')}>
                                    Autentifică-te
                                </button>
                            </p>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <footer className="auth-footer">
                    <div className="auth-footer-links">
                        <a href="#contact">Contact</a>
                        <span className="auth-footer-dot">·</span>
                        <a href="#about">Despre noi</a>
                        <span className="auth-footer-dot">·</span>
                        <a href="#privacy">Confidențialitate</a>
                        <span className="auth-footer-dot">·</span>
                        <a href="#terms">Termeni și Condiții</a>
                    </div>
                    <p className="auth-footer-copy">© 2026 MetroBucurești. Toate drepturile rezervate.</p>
                </footer>
            </div>
        </div>
    );
}
