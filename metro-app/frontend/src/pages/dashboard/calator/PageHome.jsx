import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { API } from '../dashboardConstants';
import { XCircle, AlertTriangle, Hourglass, Calendar, Ticket, CheckCircle, MapPin, X, CreditCard } from 'lucide-react';
import './PageHome.css';

const LINE_COLORS = { M1: '#FFD200', M2: '#2B78E4', M3: '#E4002B', M4: '#00A651', M5: '#F58220' };

/* ─── Pagina Home — călător ─── */
export default function PageHome({ user, token, onNavigate, docStatus }) {
    const [biletActiv, setBiletActiv] = useState(undefined);
    const [cooldownSec, setCooldownSec] = useState(0);

    /* Station picker state */
    const [stations, setStations] = useState([]);
    const [statiePlecare, setStatiePlecare] = useState(null);
    const [statieQuery, setStatieQuery] = useState('');
    const [showStatieDrop, setShowStatieDrop] = useState(false);
    const statieRef = useRef(null);

    useEffect(() => {
        if (!token) return;
        fetch(`${API}/api/bilete/activ`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => setBiletActiv(data.activ ?? null))
            .catch(() => setBiletActiv(null));
    }, [token]);

    /* Fetch stations for picker */
    useEffect(() => {
        fetch(`${API}/api/statii`)
            .then(r => r.json())
            .then(d => setStations(d.statii || []))
            .catch(() => {});
    }, []);

    /* Close station dropdown on outside click */
    useEffect(() => {
        const handler = (e) => {
            if (statieRef.current && !statieRef.current.contains(e.target)) setShowStatieDrop(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filteredStations = stations.filter(s => {
        if (!statieQuery.trim()) return true;
        const q = statieQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return s.nume.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q);
    });

    // Fetch cooldown la montare (si la fiecare 30s) — doar pentru abonamente
    useEffect(() => {
        if (!token) return;
        const fetchCooldown = () => {
            fetch(`${API}/api/bilete/cooldown`, {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then(r => r.json())
                .then(d => { if (d.cooldownActiv) setCooldownSec(d.secundeRamase); })
                .catch(() => {});
        };
        fetchCooldown();
        const iv = setInterval(fetchCooldown, 30000);
        return () => clearInterval(iv);
    }, [token]);

    // Countdown local — scade o secunda pe secunda
    useEffect(() => {
        if (cooldownSec <= 0) return;
        const t = setInterval(() => {
            setCooldownSec(s => {
                if (s <= 1) { clearInterval(t); return 0; }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [cooldownSec > 0]); // porneste/opreste cand trece de la 0 la >0

    const [timpCurent, setTimpCurent] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => setTimpCurent(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    const numareSaptamana = [
        'Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'
    ];
    const ziSaptamana = numareSaptamana[timpCurent.getDay()];
    const formatDataStr = timpCurent.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
    const formatOra = timpCurent.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
    const dataText = `${ziSaptamana}, ${formatDataStr} \u2022 ${formatOra}`;

    // Generează descriere titlu
    const descriereTitlu = () => {
        if (!biletActiv) return '';
        if (biletActiv.tip === 'bilet') {
            return `${biletActiv.numar_calatorii_ramase} / ${biletActiv.numar_calatorii} călătorii rămase`;
        }
        const labelTip = {
            zi: '1 zi', trei_zile: '3 zile', saptamana: '1 săptămână',
            luna: '1 lună', sase_luni: '6 luni', an: '1 an',
        }[biletActiv.tip_abonament] ?? biletActiv.tip_abonament;
        return `Abonament ${labelTip}`;
    };

    // Banner documente
    const docBanner = docStatus !== 'aprobata' && docStatus !== 'in_asteptare' ? (
        <button
            className={`home-doc-banner ${
                docStatus === 'respinsa' ? 'home-doc-banner--red' : 'home-doc-banner--orange'
            }`}
            onClick={() => onNavigate('cont')}
        >
            <span className="home-doc-banner-icon">
                {docStatus === 'respinsa' ? <XCircle size={16} /> : <AlertTriangle size={16} />}
            </span>
            <span>
                {docStatus === 'respinsa' ? 'DOCUMENTE RESPINSE' : 'DOCUMENTE NETRIMISE'}
            </span>
            <span className="home-doc-banner-arrow">→</span>
        </button>
    ) : null;

    return (
        <div className="dash-section page-home">
            {/* Greeting */}
            <div className="home-greeting">
                <div className="home-greeting-row">
                    <h2 className="dash-section-title">
                        Bun venit, <span>{user?.prenume ?? 'utilizator'}</span>!
                    </h2>
                    {docBanner}
                </div>
                <p className="home-date">{dataText}</p>
            </div>

            {/* Loading */}
            {biletActiv === undefined && (
                <div className="home-empty-card" style={{ gap: '0.75rem', padding: '2.5rem' }}>
                    <div className="ang-spinner" />
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>Se încarcă titlul de călătorie...</p>
                </div>
            )}

            {/* Card QR sau stare goală */}
            {biletActiv !== undefined && (biletActiv ? (
                <div className="home-qr-card">
                    <div className="home-qr-header">
                        <div className="home-qr-badge">
                            {biletActiv.tip === 'abonament' ? <><Calendar size={14} /> Abonament activ</> : <><Ticket size={14} /> Bilet activ</>}
                        </div>
                        <p className="home-qr-desc">{descriereTitlu()}</p>
                        {biletActiv.tip === 'abonament' && biletActiv.data_expirare && (
                            <p className="home-qr-valabil">
                                Valabil până la:{' '}
                                <strong>
                                    {new Date(biletActiv.data_expirare).toLocaleDateString('ro-RO', {
                                        day: 'numeric', month: 'long', year: 'numeric'
                                    })}
                                </strong>
                            </p>
                        )}
                        {biletActiv.reducere_aplicata && (
                            <span style={{
                                display: 'inline-block', marginTop: '0.4rem',
                                padding: '0.2rem 0.65rem',
                                background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                                borderRadius: '50px', fontSize: '0.72rem', color: '#86efac', fontWeight: 600,
                            }}><CheckCircle size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Reducere aplicată</span>
                        )}
                    </div>

                    <div className="home-qr-wrapper">
                        <div className="home-qr-glow" />

                        {/* Banner cooldown deasupra QR (doar abonament) */}
                        {biletActiv.tip === 'abonament' && cooldownSec > 0 && (
                            <div className="home-cooldown-banner">
                                <span className="home-cooldown-icon"><Hourglass size={16} /></span>
                                <div className="home-cooldown-text">
                                    <span className="home-cooldown-timer">
                                        {String(Math.floor(cooldownSec / 60)).padStart(2, '0')}
                                        :{String(cooldownSec % 60).padStart(2, '0')}
                                    </span>
                                    <span className="home-cooldown-label">până la următoarea scanare</span>
                                </div>
                            </div>
                        )}

                        <div className="home-qr-frame">
                            <div style={{
                                background: cooldownSec > 0 ? '#8a8a8a' : '#ffffff',
                                borderRadius: '12px',
                                padding: '12px',
                                display: 'inline-block',
                                lineHeight: 0,
                                opacity: cooldownSec > 0 ? 0.45 : 1,
                                filter: cooldownSec > 0 ? 'grayscale(1)' : 'none',
                                transition: 'opacity 0.4s, filter 0.4s, background 0.4s',
                            }}>
                                <QRCodeSVG
                                    value={String(biletActiv.cod_qr)}
                                    size={180}
                                    bgColor={cooldownSec > 0 ? '#8a8a8a' : '#ffffff'}
                                    fgColor="#0f0f1a"
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>
                        </div>
                    </div>

                    {cooldownSec <= 0 && (
                    <p className="home-qr-hint">Prezintă acest cod la turnichet</p>
                    )}

                    {/* Station picker */}
                    <div className="home-station-picker" ref={statieRef}>
                        <div className="home-station-selected">
                            {statiePlecare ? (
                                <>
                                    <span className="home-station-pin"><MapPin size={14} /></span>
                                    <span className="home-station-name">{statiePlecare.nume}</span>
                                    <div className="home-station-mags">
                                        {(statiePlecare.magistrale || []).map(m => (
                                            <span key={m.magistrala} className="home-station-mag" style={{ background: LINE_COLORS[m.magistrala] }}>{m.magistrala}</span>
                                        ))}
                                    </div>
                                    <button className="home-station-clear" onClick={(e) => { e.stopPropagation(); setStatiePlecare(null); setStatieQuery(''); }}><X size={12} /></button>
                                </>
                            ) : (
                                <span className="home-station-placeholder" onClick={() => setShowStatieDrop(true)}><MapPin size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> Selectează stația de plecare</span>
                            )}
                        </div>

                        {!statiePlecare && (
                            <input
                                className="home-station-input"
                                type="text"
                                placeholder="Caută stația..."
                                value={statieQuery}
                                onChange={e => { setStatieQuery(e.target.value); setShowStatieDrop(true); }}
                                onFocus={() => setShowStatieDrop(true)}
                                autoComplete="off"
                            />
                        )}

                        {showStatieDrop && !statiePlecare && (
                            <div className="home-station-dropdown">
                                {filteredStations.slice(0, 8).map(s => (
                                    <button key={s.id_statie} className="home-station-option" onClick={() => { setStatiePlecare(s); setStatieQuery(''); setShowStatieDrop(false); }}>
                                        <span>{s.nume}</span>
                                        <span className="home-station-option-mags">
                                            {(s.magistrale || []).map(m => (
                                                <span key={m.magistrala} className="home-station-mag" style={{ background: LINE_COLORS[m.magistrala] }}>{m.magistrala}</span>
                                            ))}
                                        </span>
                                    </button>
                                ))}
                                {filteredStations.length === 0 && <div className="home-station-empty">Nicio stație găsită</div>}
                            </div>
                        )}
                    </div>

                </div>
            ) : (
                <div className="home-empty-card">
                    <div className="home-empty-icon"><Ticket size={40} /></div>
                    <h3 className="home-empty-title">Niciun bilet sau abonament activ</h3>
                    <p className="home-empty-desc">
                        Nu ai niciun titlu de călătorie valabil în acest moment.
                        Cumpără un bilet sau un abonament pentru a putea călători.
                    </p>
                    <button
                        className="home-cta-btn"
                        onClick={() => onNavigate('cumparare')}
                    >
                        <span><CreditCard size={16} /></span>
                        <span>Cumpără bilet sau abonament</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </div>
            ))}
        </div>
    );
}
