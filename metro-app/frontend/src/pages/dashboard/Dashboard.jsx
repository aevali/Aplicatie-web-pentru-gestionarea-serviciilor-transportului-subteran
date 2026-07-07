import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API, navByRole, labelsByRole, getRolEfectiv } from './dashboardConstants';
import { Home, CreditCard, Ticket, Map, User, MessageCircle, ClipboardCheck, ScanLine, Headphones, Users, BarChart3, Bell, Settings, Clock, AlertTriangle, Plane, Globe, ArrowLeftRight, X, Megaphone } from 'lucide-react';
import { ChevronIcon, ChevronDownIcon } from './components/ChevronIcons';
import ProfileDropdown from './components/ProfileDropdown';
import PageHome from './calator/PageHome';
import PageCumparare from './calator/PageCumparare';
import PageBiletele from './calator/PageBiletele';
import PageCont from './calator/PageCont';
import PageHarta from './calator/PageHarta';
import PageSuport from './calator/PageSuport';
import PageTransfer from './calator/PageTransfer';
import PageOverview from './angajat/PageOverview';
import PageVerificari from './angajat/PageVerificari';
import PageNotificari from './angajat/PageNotificari';
import PageSuportClienti from './angajat/PageSuportClienti';
import PageValidare from './angajat/PageValidare';
import PageValidareTurist from './angajat/PageValidareTurist';
import PageAngajati from './admin/PageAngajati';
import PageTuristi from './admin/PageTuristi';
import PageRapoarte from './admin/PageRapoarte';
import PageAnunturi from './admin/PageAnunturi';
import PageAnunturiCalator from './calator/PageAnunturiCalator';
import PageSetari from './admin/PageSetari';
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
    const [docStatus, setDocStatus] = useState(null);
    const docStatusRef = useRef(null);

    // Badge mesaje suport noi (calator)
    const [suportNoi, setSuportNoi] = useState(0);

    // Notificări transfer bilete (calator)
    const [transferNotif, setTransferNotif] = useState([]);
    const [bellOpen, setBellOpen] = useState(false);
    const bellRef = useRef(null);

    // Anunțuri necitite (călător)
    const [anunturiNecitite, setAnunturiNecitite] = useState(0);

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

    // Fetch + poll mesaje suport noi (doar calatori)
    useEffect(() => {
        if (tipCont !== 'calator' || !token) return;
        const fetchSuportNoi = () => {
            fetch(`${API}/api/suport/mesaje-noi`, {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then(r => r.json())
                .then(d => setSuportNoi(d.numar ?? 0))
                .catch(() => {});
        };
        fetchSuportNoi();
        const iv = setInterval(fetchSuportNoi, 30000);
        return () => clearInterval(iv);
    }, [tipCont, token]);

    // Fetch + poll notificări transfer (doar calatori)
    useEffect(() => {
        if (tipCont !== 'calator' || !token) return;
        const fetchTransferNotif = () => {
            fetch(`${API}/api/bilete/notificari-transfer`, {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then(r => r.json())
                .then(d => setTransferNotif(d.notificari ?? []))
                .catch(() => {});
        };
        fetchTransferNotif();
        const iv = setInterval(fetchTransferNotif, 30000);
        return () => clearInterval(iv);
    }, [tipCont, token]);

    // Închide bell popup la click în afară
    useEffect(() => {
        const handler = (e) => {
            if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Fetch + poll anunțuri necitite (doar călători)
    useEffect(() => {
        if (tipCont !== 'calator' || !token) return;
        const fetchAnunturiNecitite = () => {
            fetch(`${API}/api/anunturi/necitite`, {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then(r => r.json())
                .then(d => setAnunturiNecitite(d.numar ?? 0))
                .catch(() => {});
        };
        fetchAnunturiNecitite();
        const iv = setInterval(fetchAnunturiNecitite, 60000);
        return () => clearInterval(iv);
    }, [tipCont, token]);

    const handleLogout = () => { logout(); navigate('/auth', { replace: true }); };
    const handleNav    = (id) => {
        if (id === 'suport') setSuportNoi(0);
        if (id === 'anunturi' && tipCont === 'calator') setAnunturiNecitite(0);
        setActivePage(id);
        setSidebarOpen(false);
        setBellOpen(false);
    };

    // Deschide bell popup și marchează ca citite
    const handleBellToggle = () => {
        const willOpen = !bellOpen;
        setBellOpen(willOpen);
        if (willOpen && transferNotif.length > 0) {
            fetch(`${API}/api/bilete/notificari-transfer/citite`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
            // Le ștergem vizual după 5s (animat)
            setTimeout(() => setTransferNotif([]), 5000);
        }
    };

    // Format timp relativ
    const formatTimp = (ts) => {
        if (!ts) return '';
        const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
        if (diff < 60) return 'acum';
        if (diff < 3600) return `acum ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `acum ${Math.floor(diff / 3600)}h`;
        return new Date(ts).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
    };

    // Callback pt PageCont sa actualizeze statusul dupa upload
    const handleDocStatusChange = (newStatus) => {
        setDocStatus(newStatus);
        docStatusRef.current = newStatus;
    };

    const initials = [user?.prenume?.[0], user?.nume?.[0]]
        .filter(Boolean).join('').toUpperCase() || (user?.email?.[0] ?? 'U').toUpperCase();

    // Badge suport calator
    const suportBadge = tipCont === 'calator' && suportNoi > 0 ? (
        <button className="topbar-suport-badge" onClick={() => handleNav('suport')}>
            <MessageCircle size={14} /> Mesaj nou
            <span className="topbar-suport-count">{suportNoi}</span>
        </button>
    ) : null;

    // Badge documente calator
    const navIconMap = {
        overview: Home, cumparare: CreditCard, bilete: Ticket, transfer: ArrowLeftRight,
        harta: Map, cont: User, suport: MessageCircle, anunturi: Megaphone,
        verificari: ClipboardCheck, validare: ScanLine, validare_turist: Globe, suport_clienti: Headphones,
        angajati: Users, turisti: Plane, rapoarte: BarChart3,
        notificari: Bell, setari: Settings
    };

    const docBadge = tipCont === 'calator' && docStatus !== 'aprobata' ? (
        docStatus === 'in_asteptare'
            ? <button className="topbar-doc-badge topbar-doc-badge--yellow" onClick={() => handleNav('cont')}><Clock size={14} /> În verificare</button>
            : <button className="topbar-doc-badge topbar-doc-badge--red" onClick={() => handleNav('cont')}>
                <AlertTriangle size={14} /> {docStatus === 'respinsa' ? 'Documente respinse' : 'Documente netransmise'}
              </button>
    ) : null;

    const renderPage = () => {
        switch (activePage) {
            // Home — diferit per rol
            case 'overview':
                if (rolEfectiv === 'calator')
                    return <PageHome user={user} token={token} onNavigate={handleNav} docStatus={docStatus} />;
                return <PageOverview user={user} rol={rolEfectiv} token={token} onNavigate={handleNav} />;

            // Calator
            case 'cumparare': return <PageCumparare user={user} token={token} onNavigate={handleNav} />;
            case 'bilete':    return <PageBiletele token={token} onNavigate={handleNav} />;
            case 'transfer':  return <PageTransfer token={token} onNavigate={handleNav} />;
            case 'harta':     return <PageHarta />;
            case 'cont':      return <PageCont user={user} token={token} onDocStatusChange={handleDocStatusChange} />;
            case 'suport':    return <PageSuport user={user} token={token} />;

            // Angajat & Admin
            case 'verificari':     return <PageVerificari token={token} />;
            case 'validare':       return <PageValidare token={token} />;
            case 'validare_turist': return <PageValidareTurist token={token} />;
            case 'suport_clienti': return <PageSuportClienti token={token} user={user} />;

            // Admin
            case 'angajati':   return <PageAngajati />;
            case 'turisti':    return <PageTuristi />;
            case 'rapoarte':   return <PageRapoarte />;

            // Anunțuri
            case 'anunturi':
                if (rolEfectiv === 'admin') return <PageAnunturi token={token} />;
                return <PageAnunturiCalator token={token} />;

            // Comun
            case 'notificari': return <PageNotificari token={token} />;
            case 'setari':     return <PageSetari token={token} />;

            default: return <PageHome user={user} onNavigate={handleNav} />;
        }
    };

    return (
        <div className="dash-root">
            {/* Metro stripe at top */}
            <div className="dash-metro-stripe" />

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
                    <div className="sidebar-logo-icon">M</div>
                    {sidebarExpand && (
                        <>
                            <div className="sidebar-logo-text">
                                <span className="sidebar-logo-main">Metro</span>
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

                {/* Buton expand — rând separat când e colaps */}
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
                    {navItems.map(item => {
                        const NavIco = navIconMap[item.id];
                        return (
                            <button
                                key={item.id}
                                className={`sidebar-nav-item ${activePage === item.id ? 'active' : ''}`}
                                onClick={() => handleNav(item.id)}
                                title={!sidebarExpand ? item.label : undefined}
                            >
                                <span className="nav-icon">{NavIco ? <NavIco size={18} /> : item.icon}</span>
                                {sidebarExpand && <span className="nav-label">{item.label}</span>}
                                {sidebarExpand && activePage === item.id && <span className="nav-active-dot" />}
                            </button>
                        );
                    })}
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

                    {/* Badge mesaje suport nou (calator) */}
                    {suportBadge}

                    {/* Badge documente calator */}
                    {docBadge}

                    {/* 🔔 Notificări transfer bilete (calator) */}
                    {tipCont === 'calator' && (
                        <div className="topbar-bell-wrap" ref={bellRef}>
                            <button
                                className={`topbar-bell-btn ${bellOpen ? 'topbar-bell-btn--active' : ''}`}
                                onClick={handleBellToggle}
                                aria-label="Notificări transfer"
                            >
                                <Bell size={18} />
                                {transferNotif.length > 0 && (
                                    <span className="topbar-bell-count">{transferNotif.length}</span>
                                )}
                            </button>

                            {bellOpen && (
                                <div className="topbar-bell-dropdown">
                                    <div className="topbar-bell-header">
                                        <span className="topbar-bell-title"><Bell size={14} /> Notificări</span>
                                        <button className="topbar-bell-close" onClick={() => setBellOpen(false)}>
                                            <X size={14} />
                                        </button>
                                    </div>
                                    {transferNotif.length === 0 ? (
                                        <div className="topbar-bell-empty">
                                            <Bell size={20} style={{ opacity: 0.3 }} />
                                            <span>Nicio notificare nouă</span>
                                        </div>
                                    ) : (
                                        <div className="topbar-bell-list">
                                            {transferNotif.map(n => (
                                                <div key={n.id_notificare} className="topbar-bell-item">
                                                    <div className="topbar-bell-item-icon">
                                                        <ArrowLeftRight size={14} />
                                                    </div>
                                                    <div className="topbar-bell-item-body">
                                                        <span className="topbar-bell-item-text">{n.mesaj}</span>
                                                        <span className="topbar-bell-item-time">{formatTimp(n.created_at)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Anunțuri necitite badge (calator) */}
                    {tipCont === 'calator' && anunturiNecitite > 0 && (
                        <button
                            className="topbar-anunturi-badge"
                            onClick={() => handleNav('anunturi')}
                            aria-label="Anunțuri necitite"
                        >
                            <Megaphone size={14} />
                            <span className="topbar-anunturi-count">{anunturiNecitite}</span>
                        </button>
                    )}

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

            {/* Backdrop profil */}
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
