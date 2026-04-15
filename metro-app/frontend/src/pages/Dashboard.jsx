import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

/* ─── Navigare per rol ─── */
const navByRole = {
    calator: [
        { id: 'overview',  icon: '🏠', label: 'Home' },
        { id: 'cumparare', icon: '💳', label: 'Cumpărare' },
        { id: 'bilete',    icon: '🎫', label: 'Biletele Mele' },
        { id: 'harta',     icon: '🗺️', label: 'Harta Rețelei' },
    ],
    angajat: [
        { id: 'overview',   icon: '🏠', label: 'Home' },
        { id: 'validare',   icon: '🎫', label: 'Validare Bilete' },
        { id: 'raport',     icon: '📋', label: 'Raport Tură' },
        { id: 'notificari', icon: '🔔', label: 'Notificări' },
    ],
    admin: [
        { id: 'overview',   icon: '🏠', label: 'Home' },
        { id: 'angajati',   icon: '👤', label: 'Gestionare Angajați' },
        { id: 'rapoarte',   icon: '📊', label: 'Rapoarte' },
        { id: 'notificari', icon: '🔔', label: 'Notificări' },
        { id: 'setari',     icon: '⚙️', label: 'Setări' },
    ],
};

const labelsByRole  = { admin: 'Administrator', angajat: 'Angajat', calator: 'Călător' };
const tipCalatorLabel = { adult: 'Adult', elev: 'Elev', student: 'Student', pensionar: 'Pensionar' };

function getRolEfectiv(user, tipCont) {
    if (tipCont === 'angajat' && user?.rol === 'admin') return 'admin';
    return tipCont ?? 'calator';
}

/* ─── Pagina Home — Admin & Angajat ─── */
function PageOverview({ user, rol }) {
    const cards = {
        angajat: [
            { icon: '✅', title: 'Bilete validate azi', value: '0',  sub: 'nicio validare' },
            { icon: '⏱️', title: 'Ore tură',            value: '0h', sub: 'tură neîncepută' },
        ],
        admin: [
            { icon: '👥', title: 'Angajați activi',    value: '—', sub: 'se încarcă...' },
            { icon: '🎫', title: 'Bilete vândute azi', value: '—', sub: 'se încarcă...' },
            { icon: '📈', title: 'Venituri totale',    value: '—', sub: 'se încarcă...' },
        ],
    };
    const items = cards[rol] ?? [];
    return (
        <div className="dash-section">
            <h2 className="dash-section-title">
                Bun venit, <span>{user?.prenume ?? 'utilizator'}</span>!
            </h2>
            <p className="dash-section-sub">
                {rol === 'angajat' && 'Activitate curentă a turei.'}
                {rol === 'admin'   && 'Vizualizare generală a sistemului.'}
            </p>
            <div className="dash-stats">
                {items.map(c => (
                    <div className="dash-stat-card" key={c.title}>
                        <div className="dash-stat-icon">{c.icon}</div>
                        <div className="dash-stat-body">
                            <p className="dash-stat-value">{c.value}</p>
                            <p className="dash-stat-label">{c.title}</p>
                            <p className="dash-stat-sub">{c.sub}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─── Pagina Home — călător ─── */
function PageHome({ user, onNavigate }) {
    // În viitor: fetch din API pentru bilet/abonament activ
    // Momentan simulăm: null = fără bilet activ
    const biletActiv = null;
    /*
     * Structura așteptată când vine din API:
     * {
     *   id: 'BLT-20240408-001',
     *   tip: 'abonament',          // 'bilet' | 'abonament'
     *   descriere: 'Abonament lunar',
     *   valabil_pana: '2026-05-08T23:59:59Z',
     *   qr_payload: 'METRO:BLT-20240408-001:...',
     * }
     */

    const [timpCurent, setTimpCurent] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => setTimpCurent(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    const numareSaptamana = [
        'Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'
    ];
    const ziSaptamana = numareSaptamana[timpCurent.getDay()];
    const formatData = timpCurent.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
    const formatOra = timpCurent.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
    const dataText = `${ziSaptamana}, ${formatData} \u2022 ${formatOra}`;

    return (
        <div className="dash-section page-home">
            {/* Greeting */}
            <div className="home-greeting">
                <h2 className="dash-section-title">
                    Bun venit, <span>{user?.prenume ?? 'utilizator'}</span>!
                </h2>
                <p className="home-date">{dataText}</p>
            </div>

            {/* Card QR sau stare goală */}
            {biletActiv ? (
                <div className="home-qr-card">
                    <div className="home-qr-header">
                        <div className="home-qr-badge">
                            {biletActiv.tip === 'abonament' ? '📅 Abonament activ' : '🎫 Bilet activ'}
                        </div>
                        <p className="home-qr-desc">{biletActiv.descriere}</p>
                        <p className="home-qr-valabil">
                            Valabil până la:{' '}
                            <strong>
                                {new Date(biletActiv.valabil_pana).toLocaleDateString('ro-RO', {
                                    day: 'numeric', month: 'long', year: 'numeric'
                                })}
                            </strong>
                        </p>
                    </div>

                    <div className="home-qr-wrapper">
                        <div className="home-qr-glow" />
                        <div className="home-qr-frame">
                            <QRCodeSVG
                                value={biletActiv.qr_payload}
                                size={200}
                                bgColor="transparent"
                                fgColor="#c7d2fe"
                                level="H"
                                includeMargin={false}
                            />
                        </div>
                    </div>

                    <p className="home-qr-hint">Prezintă acest cod la turnichet</p>
                </div>
            ) : (
                <div className="home-empty-card">
                    <div className="home-empty-icon">🎫</div>
                    <h3 className="home-empty-title">Niciun bilet sau abonament activ</h3>
                    <p className="home-empty-desc">
                        Nu ai niciun titlu de călătorie valabil în acest moment.
                        Cumpără un bilet sau un abonament pentru a putea călători.
                    </p>
                    <button
                        className="home-cta-btn"
                        onClick={() => onNavigate('cumparare')}
                    >
                        <span>💳</span>
                        <span>Cumpără bilet sau abonament</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}

function PagePlaceholder({ icon, title, desc }) {
    return (
        <div className="dash-section dash-placeholder">
            <div className="placeholder-icon">{icon}</div>
            <h2 className="placeholder-title">{title}</h2>
            <p className="placeholder-desc">{desc}</p>
            <div className="placeholder-badge">În curând</div>
        </div>
    );
}

/* ─── Dropdown profil ─── */
function ProfileDropdown({ user, label, tipCont, rolEfectiv, onLogout, onNavigate }) {
    const initials = [user?.prenume?.[0], user?.nume?.[0]]
        .filter(Boolean).join('').toUpperCase() || (user?.email?.[0] ?? 'U').toUpperCase();

    const tipLabel = tipCont === 'calator'
        ? (tipCalatorLabel[user?.tip] ?? 'Călător')
        : label;

    return (
        <div className="profile-dropdown">
            <div className="pd-header">
                <div className="pd-avatar">{initials}</div>
                <div className="pd-info">
                    <p className="pd-name">
                        {user?.prenume && user?.nume
                            ? `${user.prenume} ${user.nume}`
                            : user?.email ?? 'Utilizator'}
                    </p>
                    <p className="pd-role">{tipLabel}</p>
                </div>
            </div>

            <div className="pd-divider" />

            {rolEfectiv === 'calator' && (
                <>
                    <div className="pd-menu">
                        <button className="pd-item" type="button" onClick={() => onNavigate('cont')}>
                            <span className="pd-item-icon">👤</span>
                            <span>Contul Meu</span>
                        </button>
                        <button className="pd-item pd-item--disabled" type="button">
                            <span className="pd-item-icon">💬</span>
                            <span>Suport</span>
                            <span className="pd-soon">curând</span>
                        </button>
                    </div>

                    <div className="pd-divider" />
                </>
            )}

            <div className="pd-menu">
                <button className="pd-item pd-item--danger" type="button" onClick={onLogout}>
                    <span className="pd-item-icon">🚪</span>
                    <span>Deconectare</span>
                </button>
            </div>
        </div>
    );
}

/* ─── Dashboard principal ─── */
export default function Dashboard() {
    const { user, tipCont, logout } = useAuth();
    const navigate = useNavigate();

    const [activePage,    setActivePage]    = useState('overview');
    const [sidebarOpen,   setSidebarOpen]   = useState(false);   // mobil
    const [sidebarExpand, setSidebarExpand] = useState(true);    // desktop expand/collapse
    const [profileOpen,   setProfileOpen]   = useState(false);

    const rolEfectiv = getRolEfectiv(user, tipCont);
    const navItems   = navByRole[rolEfectiv] ?? navByRole.calator;
    const label      = labelsByRole[rolEfectiv] ?? rolEfectiv;

    const handleLogout = () => { logout(); navigate('/auth', { replace: true }); };
    const handleNav    = (id) => { setActivePage(id); setSidebarOpen(false); };

    const initials = [user?.prenume?.[0], user?.nume?.[0]]
        .filter(Boolean).join('').toUpperCase() || (user?.email?.[0] ?? 'U').toUpperCase();

    const renderPage = () => {
        switch (activePage) {
            // Home — diferit per rol
            case 'overview':
                if (rolEfectiv === 'calator')
                    return <PageHome user={user} onNavigate={handleNav} />;
                return <PageOverview user={user} rol={rolEfectiv} />;

            // Calator
            case 'cumparare': return <PagePlaceholder icon="💳" title="Cumpărare"          desc="Alege tipul de bilet sau abonament dorit și finalizează plata." />;
            case 'bilete':    return <PagePlaceholder icon="🎫" title="Biletele Mele"       desc="Vizualizează și gestionează biletele și abonamentele tale de metrou." />;
            case 'harta':     return <PagePlaceholder icon="🗺️" title="Harta Rețelei"       desc="Harta interactivă a rețelei de metrou București." />;
            case 'cont':      return <PagePlaceholder icon="👤" title="Contul Meu"          desc="Profilul tău, statistici și istoricul călătoriilor." />;

            // Angajat
            case 'validare':   return <PagePlaceholder icon="✅" title="Validare Bilete"    desc="Verifică și validează titlurile de călătorie ale pasagerilor." />;
            case 'raport':     return <PagePlaceholder icon="📋" title="Raport Tură"        desc="Raportul detaliat al activității din tura curentă." />;

            // Admin
            case 'angajati':   return <PagePlaceholder icon="👤" title="Gestionare Angajați" desc="Creează, editează și gestionează conturile angajaților." />;
            case 'rapoarte':   return <PagePlaceholder icon="📊" title="Rapoarte"            desc="Statistici și analize detaliate ale utilizării sistemului." />;

            // Comun
            case 'notificari': return <PagePlaceholder icon="🔔" title="Notificări"         desc="Alerte și mesaje operaționale importante." />;
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

                    {/* Spacer pentru a împinge profilul la dreapta */}
                    <div style={{ flex: 1 }} />

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

/* ─── Iconiță chevron SVG ─── */
function ChevronIcon({ rotated }) {
    return (
        <svg
            className={`chevron-icon ${rotated ? 'rotated' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
        >
            <polyline points="15 18 9 12 15 6" />
        </svg>
    );
}

function ChevronDownIcon({ rotated }) {
    return (
        <svg
            className={`chevron-down-icon ${rotated ? 'rotated' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            width="13" height="13" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
        >
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}
