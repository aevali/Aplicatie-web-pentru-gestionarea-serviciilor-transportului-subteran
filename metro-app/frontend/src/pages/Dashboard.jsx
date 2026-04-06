import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

// Carduri per rol efectiv
const cardsByRole = {
    admin: [
        { icon: '👤', title: 'Creare Cont Angajat', desc: 'Adaugă un nou angajat în sistem' },
        { icon: '🔔', title: 'Notificări', desc: 'Alerte și mesaje operaționale' },
        { icon: '⚙️', title: 'Setări', desc: 'Configurații generale ale sistemului' },
        { icon: '📊', title: 'Rapoarte', desc: 'Statistici și analize de utilizare' },
    ],
    angajat: [
        { icon: '🎫', title: 'Validare Bilete', desc: 'Verifică și validează titluri de călătorie' },
        { icon: '📋', title: 'Raport Tură', desc: 'Raportul activității curente' },
        { icon: '🔔', title: 'Notificări', desc: 'Alerte și mesaje operaționale' },
    ],
    calator: [
        { icon: '🎫', title: 'Biletele Mele', desc: 'Titluri de călătorie active și istorice' },
        { icon: '🗺️', title: 'Harta Rețelei', desc: 'Planifică ruta optimă' },
        { icon: '💳', title: 'Reîncarcă Card', desc: 'Adaugă fonduri pe cardul de metrou' },
        { icon: '📜', title: 'Istoric Călătorii', desc: 'Toate călătoriile tale anterioare' },
    ],
};

const labelsByRole = {
    admin: 'Administrator',
    angajat: 'Angajat',
    calator: 'Călător',
};

// Determina rolul efectiv: adminii sunt angajati cu rol='admin'
function getRolEfectiv(user, tipCont) {
    if (tipCont === 'angajat' && user?.rol === 'admin') return 'admin';
    return tipCont ?? 'calator';
}

export default function Dashboard() {
    const { user, tipCont, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/auth', { replace: true });
    };

    const rolEfectiv = getRolEfectiv(user, tipCont);
    const cards = cardsByRole[rolEfectiv] ?? [];
    const label = labelsByRole[rolEfectiv] ?? rolEfectiv;

    return (
        <div className="dashboard-page">
            {/* Orbs */}
            <div className="dash-orb dash-orb-1" />
            <div className="dash-orb dash-orb-2" />
            <div className="dash-orb dash-orb-3" />

            {/* Metro dots */}
            <div className="dash-dots">
                <div className="dash-dot" />
                <div className="dash-dot" />
                <div className="dash-dot" />
                <div className="dash-dot" />
                <div className="dash-dot" />
            </div>

            {/* Content */}
            <div className="dashboard-content">
                {/* Navbar */}
                <nav className="dash-navbar">
                    <span className="dash-logo">
                        <span className="dash-logo-icon">🚇</span>
                        <span className="dash-logo-text">MetroApp</span>
                    </span>

                    <div className="dash-user-info">
                        <div className="dash-user-badge">
                            <span>👤</span>
                            <span>{user?.prenume ?? user?.email ?? 'Utilizator'}</span>
                            <span style={{ opacity: 0.5 }}>·</span>
                            <span>{label}</span>
                        </div>
                        <button className="dash-logout-btn" onClick={handleLogout}>
                            Deconectare
                        </button>
                    </div>
                </nav>

                {/* Main */}
                <main className="dash-main">
                    <h1 className="dash-welcome">
                        Bun venit, {user?.prenume ?? 'utilizator'}! 👋
                    </h1>

                    <div className="dash-cards">
                        {cards.map((card) => (
                            <div className="dash-card" key={card.title}>
                                <div className="dash-card-icon">{card.icon}</div>
                                <p className="dash-card-title">{card.title}</p>
                                <p className="dash-card-desc">{card.desc}</p>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
}
