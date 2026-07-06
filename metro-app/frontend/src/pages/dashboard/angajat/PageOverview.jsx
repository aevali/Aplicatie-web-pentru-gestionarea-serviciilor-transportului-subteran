/* ─── Pagina Home — Angajat & Admin ─── */
import { useState, useEffect, useCallback } from 'react';
import {
    ClipboardCheck, ClipboardList, Headphones, Star, Bell, ScanLine, Globe,
    Users, TrendingUp, Ticket, CalendarCheck, FileBarChart, Megaphone, ArrowRight,
} from 'lucide-react';
import { API, formatPret } from '../dashboardConstants';
import './PageOverview.css';

const ZILE_SAPTAMANA = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];

function formatDataAzi() {
    const acum = new Date();
    const zi = ZILE_SAPTAMANA[acum.getDay()];
    const data = acum.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${zi}, ${data}`;
}

function StatCard(props) {
    const { Icon, label, value, sub, tone } = props;
    return (
        <div className={`ovw-stat-card${tone ? ` ovw-stat-card--${tone}` : ''}`}>
            <div className="ovw-stat-icon"><Icon size={20} /></div>
            <div className="ovw-stat-body">
                <p className="ovw-stat-value">{value}</p>
                <p className="ovw-stat-label">{label}</p>
                {sub && <p className="ovw-stat-sub">{sub}</p>}
            </div>
        </div>
    );
}

function ActionCard(props) {
    const { Icon, label, desc, onClick } = props;
    return (
        <button type="button" className="ovw-action-card" onClick={onClick}>
            <div className="ovw-action-icon"><Icon size={18} /></div>
            <div className="ovw-action-body">
                <p className="ovw-action-label">{label}</p>
                <p className="ovw-action-desc">{desc}</p>
            </div>
            <ArrowRight size={16} className="ovw-action-arrow" />
        </button>
    );
}

export default function PageOverview({ user, rol, token, onNavigate }) {
    if (rol === 'admin') return <OverviewAdmin user={user} token={token} onNavigate={onNavigate} />;
    return <OverviewAngajat user={user} token={token} onNavigate={onNavigate} />;
}

/* ══════════════════════════════════════════════
   ANGAJAT
   ══════════════════════════════════════════════ */
function OverviewAngajat({ user, token, onNavigate }) {
    const [stats, setStats] = useState(null);

    const fetchStats = useCallback(async () => {
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const [rVerif, rTickets, rRating, rNotif] = await Promise.all([
                fetch(`${API}/api/verificari?status=in_asteptare`, { headers }),
                fetch(`${API}/api/suport/tickets?status=deschis`, { headers }),
                fetch(`${API}/api/suport/rating-meu`, { headers }),
                fetch(`${API}/api/notificari/numar-necitite`, { headers }),
            ]);
            const [verif, tickets, rating, notif] = await Promise.all([
                rVerif.ok ? rVerif.json() : [],
                rTickets.ok ? rTickets.json() : { tickets: [] },
                rRating.ok ? rRating.json() : {},
                rNotif.ok ? rNotif.json() : { numar: 0 },
            ]);
            setStats({
                cereriAsteptare: Array.isArray(verif) ? verif.length : 0,
                ticketeDeschise: tickets.tickets?.length ?? 0,
                ratingMediu: rating.rating_mediu != null ? parseFloat(rating.rating_mediu) : null,
                ticketeCuRating: parseInt(rating.tickete_cu_rating ?? 0, 10),
                notificariNecitite: notif.numar ?? 0,
            });
        } catch {
            setStats({ cereriAsteptare: 0, ticketeDeschise: 0, ratingMediu: null, ticketeCuRating: 0, notificariNecitite: 0 });
        }
    }, [token]);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    return (
        <div className="dash-section ovw-page">
            <div className="ovw-header">
                <div>
                    <h2 className="dash-section-title">Bună, <span>{user?.prenume ?? 'utilizator'}</span></h2>
                    <p className="dash-section-sub">{formatDataAzi()}</p>
                </div>
            </div>

            <div className="ovw-stats-grid">
                <StatCard
                    Icon={ClipboardCheck}
                    label="Cereri în așteptare"
                    value={stats ? stats.cereriAsteptare : '—'}
                    sub="documente de verificat"
                />
                <StatCard
                    Icon={Headphones}
                    label="Tickete suport deschise"
                    value={stats ? stats.ticketeDeschise : '—'}
                    sub="așteaptă un răspuns"
                />
                <StatCard
                    Icon={Star}
                    label="Rating mediu"
                    value={stats?.ratingMediu != null ? stats.ratingMediu.toFixed(1) : '—'}
                    sub={stats && stats.ticketeCuRating > 0 ? `din ${stats.ticketeCuRating} evaluări` : 'fără evaluări încă'}
                />
                <StatCard
                    Icon={Bell}
                    label="Notificări necitite"
                    value={stats ? stats.notificariNecitite : '—'}
                />
            </div>

            <div className="ovw-section">
                <h3 className="ovw-section-title">Acțiuni rapide</h3>
                <div className="ovw-actions-grid">
                    <ActionCard
                        Icon={ClipboardList}
                        label="Verificări documente"
                        desc="Aprobă sau respinge cereri de reducere"
                        onClick={() => onNavigate?.('verificari')}
                    />
                    <ActionCard
                        Icon={ScanLine}
                        label="Validare bilete"
                        desc="Scanează codul QR al călătorilor"
                        onClick={() => onNavigate?.('validare')}
                    />
                    <ActionCard
                        Icon={Globe}
                        label="Validare card turist"
                        desc="Activează un tourist pass"
                        onClick={() => onNavigate?.('validare_turist')}
                    />
                    <ActionCard
                        Icon={Headphones}
                        label="Suport clienți"
                        desc="Preia și răspunde la tickete deschise"
                        onClick={() => onNavigate?.('suport_clienti')}
                    />
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════
   ADMIN
   ══════════════════════════════════════════════ */
function OverviewAdmin({ user, token, onNavigate }) {
    const [sumar, setSumar] = useState(null);
    const [operational, setOperational] = useState(null);
    const [topAngajati, setTopAngajati] = useState([]);

    const fetchData = useCallback(async () => {
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const [rSumar, rAngajati, rVerif, rTickets, rRating] = await Promise.all([
                fetch(`${API}/api/rapoarte/sumar`, { headers }),
                fetch(`${API}/api/angajati`, { headers }),
                fetch(`${API}/api/verificari?status=in_asteptare`, { headers }),
                fetch(`${API}/api/suport/tickets?status=deschis`, { headers }),
                fetch(`${API}/api/suport/rating-angajati`, { headers }),
            ]);
            const [sumarData, angajatiData, verifData, ticketsData, ratingData] = await Promise.all([
                rSumar.ok ? rSumar.json() : null,
                rAngajati.ok ? rAngajati.json() : [],
                rVerif.ok ? rVerif.json() : [],
                rTickets.ok ? rTickets.json() : { tickets: [] },
                rRating.ok ? rRating.json() : { angajati: [] },
            ]);
            setSumar(sumarData);
            setOperational({
                angajati: Array.isArray(angajatiData) ? angajatiData.length : 0,
                cereriAsteptare: Array.isArray(verifData) ? verifData.length : 0,
                ticketeDeschise: ticketsData.tickets?.length ?? 0,
            });
            setTopAngajati(
                (ratingData.angajati ?? [])
                    .filter(a => parseInt(a.tickete_cu_rating, 10) > 0)
                    .slice(0, 4)
            );
        } catch {
            setSumar(null);
            setOperational({ angajati: 0, cereriAsteptare: 0, ticketeDeschise: 0 });
        }
    }, [token]);

    useEffect(() => { fetchData(); }, [fetchData]);

    return (
        <div className="dash-section ovw-page">
            <div className="ovw-header">
                <div>
                    <h2 className="dash-section-title">Bună, <span>{user?.prenume ?? 'utilizator'}</span></h2>
                    <p className="dash-section-sub">{formatDataAzi()}</p>
                </div>
            </div>

            <div className="ovw-stats-grid">
                <StatCard Icon={Users} label="Călători înregistrați" value={sumar ? sumar.total_calatori : '—'} />
                <StatCard Icon={TrendingUp} label="Venituri totale" value={sumar ? formatPret(sumar.total_venituri) : '—'} />
                <StatCard Icon={Ticket} label="Călătorii efectuate" value={sumar ? sumar.total_calatorii : '—'} />
                <StatCard Icon={CalendarCheck} label="Abonamente active" value={sumar ? sumar.abonamente_active : '—'} />
            </div>

            <div className="ovw-stats-grid ovw-stats-grid--secondary">
                <StatCard Icon={Users} label="Angajați" value={operational ? operational.angajati : '—'} sub="conturi active" />
                <StatCard
                    Icon={ClipboardCheck}
                    label="Cereri în așteptare"
                    value={operational ? operational.cereriAsteptare : '—'}
                    sub="necesită verificare"
                    tone={operational && operational.cereriAsteptare > 0 ? 'warning' : undefined}
                />
                <StatCard
                    Icon={Headphones}
                    label="Tickete deschise"
                    value={operational ? operational.ticketeDeschise : '—'}
                    sub="neasignate încă"
                    tone={operational && operational.ticketeDeschise > 0 ? 'warning' : undefined}
                />
            </div>

            <div className="ovw-columns">
                <div className="ovw-section">
                    <h3 className="ovw-section-title">Top angajați după rating</h3>
                    {topAngajati.length === 0 ? (
                        <p className="ovw-empty-text">Încă nu sunt destule evaluări pentru un clasament.</p>
                    ) : (
                        <div className="ovw-employee-list">
                            {topAngajati.map(a => (
                                <div className="ovw-employee-row" key={a.id_angajat}>
                                    <div className="ovw-employee-avatar">
                                        {(a.prenume?.[0] ?? '?').toUpperCase()}{(a.nume?.[0] ?? '').toUpperCase()}
                                    </div>
                                    <div className="ovw-employee-info">
                                        <p className="ovw-employee-name">{a.prenume} {a.nume}</p>
                                        <p className="ovw-employee-sub">{a.total_tickete} tickete rezolvate</p>
                                    </div>
                                    <div className="ovw-employee-rating">
                                        <Star size={14} />
                                        <span>{parseFloat(a.rating_mediu ?? 0).toFixed(1)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="ovw-section">
                    <h3 className="ovw-section-title">Acțiuni rapide</h3>
                    <div className="ovw-actions-grid ovw-actions-grid--stack">
                        <ActionCard
                            Icon={FileBarChart}
                            label="Rapoarte"
                            desc="Statistici detaliate și grafice"
                            onClick={() => onNavigate?.('rapoarte')}
                        />
                        <ActionCard
                            Icon={Users}
                            label="Gestionare angajați"
                            desc="Adaugă sau șterge conturi"
                            onClick={() => onNavigate?.('angajati')}
                        />
                        <ActionCard
                            Icon={ClipboardList}
                            label="Verificări documente"
                            desc="Cereri de reducere în așteptare"
                            onClick={() => onNavigate?.('verificari')}
                        />
                        <ActionCard
                            Icon={Megaphone}
                            label="Anunțuri"
                            desc="Publică un anunț nou pentru călători"
                            onClick={() => onNavigate?.('anunturi')}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
