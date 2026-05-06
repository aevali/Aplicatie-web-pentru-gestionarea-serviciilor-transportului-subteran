import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API, navByRole, labelsByRole, getRolEfectiv } from './dashboardConstants';
import { ChevronIcon, ChevronDownIcon } from './components/ChevronIcons';
import ProfileDropdown from './components/ProfileDropdown';
import PagePlaceholder from './components/PagePlaceholder';
import PageHome from './calator/PageHome';
import PageCumparare from './calator/PageCumparare';
import PageBiletele from './calator/PageBiletele';
import PageCont from './calator/PageCont';
import PageHarta from './calator/PageHarta';
import PageSuport from './calator/PageSuport';
import PageOverview from './angajat/PageOverview';
import PageVerificari from './angajat/PageVerificari';
import PageNotificari from './angajat/PageNotificari';
import PageSuportClienti from './angajat/PageSuportClienti';
import PageAngajati from './admin/PageAngajati';
import './Dashboard.css';

/* ─── Dashboard principal ─── */
export default function Dashboard() {
    const { user, tipCont, logout } = useAuth();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const [activePage,    setActivePage]    = useState('overview');
    const [sidebarOpen,   setSidebarOpen]   = useState(false);
    const [sidebarExpand, setSidebarExpand] = useState(true);
    const [profileOpen,   setProfileOpen]   = useState(false);

    // Status documente calator (pentru badge topbar)
    const [docStatus, setDocStatus] = useState(null); // null=neincarcat, 'in_asteptare', 'aprobata', 'respinsa'
    const docStatusRef = useRef(null);

    const rolEfectiv = getRolEfectiv(user, tipCont);
    const navItems   = navByRole[rolEfectiv] ?? navByRole.calator;
    const label      = labelsByRole[rolEfectiv] ?? rolEfectiv;

    // Fetch status documente (doar pentru calatori)
    useEffect(() => {
        if (tipCont !== 'calator' || !token) return;
        fetch(`${API}/api/cont/verificare`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => {
                const st = data.cerere ? data.cerere.status : null;
                setDocStatus(st);
                docStatusRef.current = st;
            })
            .catch(() => {});
    }, [tipCont, token]);

    const handleLogout = () => { logout(); navigate('/auth', { replace: true }); };
    const handleNav    = (id) => { setActivePage(id); setSidebarOpen(false); };

    // Callback pt PageCont sa actualizeze statusul dupa upload
    const handleDocStatusChange = (newStatus) => {
        setDocStatus(newStatus);
        docStatusRef.current = newStatus;
    };

    const initials = [user?.prenume?.[0], user?.nume?.[0]]
        .filter(Boolean).join('').toUpperCase() || (user?.email?.[0] ?? 'U').toUpperCase();

    // Badge topbar
    const docBadge = tipCont === 'calator' && docStatus !== 'aprobata' ? (
        docStatus === 'in_asteptare'
            ? <button className="topbar-doc-badge topbar-doc-badge--yellow" onClick={() => handleNav('cont')}>🕐 În verificare</button>
            : <button className="topbar-doc-badge topbar-doc-badge--red" onClick={() => handleNav('cont')}>
                ⚠️ {docStatus === 'respinsa' ? 'Documente respinse' : 'Documente netransmise'}
              </button>
    ) : null;

    const renderPage = () => {
        switch (activePage) {
            // Home — diferit per rol
            case 'overview':
                if (rolEfectiv === 'calator')
                    return <PageHome user={user} token={token} onNavigate={handleNav} docStatus={docStatus} />;
                return <PageOverview user={user} rol={rolEfectiv} />;

            // Calator
            case 'cumparare': return <PageCumparare user={user} token={token} onNavigate={handleNav} />;
            case 'bilete':    return <PageBiletele token={token} onNavigate={handleNav} />;
            case 'harta':     return <PageHarta />;
            case 'cont':      return <PageCont user={user} token={token} onDocStatusChange={handleDocStatusChange} />;
            case 'suport':    return <PageSuport user={user} token={token} />;

            // Angajat & Admin
            case 'verificari':     return <PageVerificari token={token} />;
            case 'validare':       return <PagePlaceholder icon="✅" title="Validare Bilete"    desc="Verifică și validează titlurile de călătorie ale pasagerilor." />;
            case 'suport_clienti': return <PageSuportClienti token={token} user={user} />;
            case 'raport':         return <PagePlaceholder icon="📑" title="Raport Tură"        desc="Raportul detaliat al activității din tura curentă." />;

            // Admin
            case 'angajati':   return <PageAngajati />;
            case 'rapoarte':   return <PagePlaceholder icon="📊" title="Rapoarte"            desc="Statistici și analize detaliate ale utilizării sistemului." />;

            // Comun
            case 'notificari': return <PageNotificari token={token} />;
            case 'setari':     return <PagePlaceholder icon="⚙️" title="Setări"             desc="Configurații generale ale sistemului MetroBucurești." />;

            default: return <PageHome user={user} onNavigate={handleNav} />;
        }
    };

    return (
        <div className="dash-root">
            {/* Fundal */}
            <div className="dash-bg" />
            <div className="dash-orb dash-orb-1" />
            <div className="dash-orb dash-orb-2" />
            <div className="dash-orb dash-orb-3" />
            <div className="dash-dots">
                <div className="dash-dot"/><div className="dash-dot"/>
                <div className="dash-dot"/><div className="dash-dot"/>
                <div className="dash-dot"/>
            </div>

            {/* Overlay mobil */}
            {sidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
            )}

            {/* ══ SIDEBAR ══ */}
            <aside className={`dash-sidebar
                ${sidebarOpen   ? 'mobile-open' : ''}
                ${sidebarExpand ? 'expanded'    : 'collapsed'}
            `}>
                {/* Logo */}
                <div className="sidebar-logo">
                    <span className="sidebar-logo-icon">🚇</span>
                    {sidebarExpand && (
                        <>
                            <div className="sidebar-logo-text">
                                <span className="sidebar-logo-main">Metrou</span>
                                <span className="sidebar-logo-sub">București</span>
                            </div>
                            {/* Buton collapse — vizibil doar când e extins */}
                            <button
                                className="sidebar-toggle-btn"
                                onClick={() => setSidebarExpand(false)}
                                aria-label="Restrânge meniu"
                                title="Restrânge"
                            >
                                <ChevronIcon rotated={false} />
                            </button>
                        </>
                    )}
                </div>

                {/* Buton expand — rând separat când e colaps, fără suprapunere */}
                {!sidebarExpand && (
                    <div className="sidebar-expand-row">
                        <button
                            className="sidebar-toggle-btn"
                            onClick={() => setSidebarExpand(true)}
                            aria-label="Extinde meniu"
                            title="Extinde"
                        >
                            <ChevronIcon rotated={true} />
                        </button>
                    </div>
                )}

                <div className="sidebar-divider" />

                {/* Nav */}
                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            className={`sidebar-nav-item ${activePage === item.id ? 'active' : ''}`}
                            onClick={() => handleNav(item.id)}
                            title={!sidebarExpand ? item.label : undefined}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {sidebarExpand && <span className="nav-label">{item.label}</span>}
                            {sidebarExpand && activePage === item.id && <span className="nav-active-dot" />}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* ══ MAIN ══ */}
            <div className="dash-main">
                {/* Topbar */}
                <header className="dash-topbar">
                    {/* Hamburger — mobil */}
                    <button
                        className="hamburger"
                        onClick={() => setSidebarOpen(v => !v)}
                        aria-label="Toggle meniu"
                    >
                        <span /><span /><span />
                    </button>

                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* Badge documente calator */}
                    {docBadge}

                    {/* Profil dreapta */}
                    <div className="topbar-profile-wrap">
                        <button
                            className={`topbar-profile-btn ${profileOpen ? 'active' : ''}`}
                            onClick={() => setProfileOpen(v => !v)}
                            type="button"
                            aria-label="Meniu profil"
                        >
                            <div className="topbar-avatar">{initials}</div>
                            <span className="topbar-username">
                                {user?.prenume ?? user?.email ?? 'Utilizator'}
                            </span>
                            <ChevronDownIcon rotated={profileOpen} />
                        </button>
                    </div>
                </header>

                {/* Content */}
                <main className="dash-content">
                    {renderPage()}
                </main>
            </div>

            {/* Backdrop profil — în afara header-ului, ocupă tot ecranul */}
            {profileOpen && (
                <>
                    <div
                        className="profile-backdrop"
                        onClick={() => setProfileOpen(false)}
                    />
                    <div className="profile-dropdown-portal">
                        <ProfileDropdown
                            user={user}
                            label={label}
                            tipCont={tipCont}
                            rolEfectiv={rolEfectiv}
                            onLogout={handleLogout}
                            onNavigate={(id) => { handleNav(id); setProfileOpen(false); }}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
