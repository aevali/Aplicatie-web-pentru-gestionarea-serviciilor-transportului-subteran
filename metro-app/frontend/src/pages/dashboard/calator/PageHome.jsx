import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { API } from '../dashboardConstants';
import './PageHome.css';

/* ─── Pagina Home — călător ─── */
export default function PageHome({ user, token, onNavigate, docStatus }) {
    const [biletActiv, setBiletActiv] = useState(undefined);
    const [cooldownSec, setCooldownSec] = useState(0); // secunde ramase cooldown abonament

    useEffect(() => {
        if (!token) return;
        fetch(`${API}/api/bilete/activ`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => setBiletActiv(data.activ ?? null))
            .catch(() => setBiletActiv(null));
    }, [token]);

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
                {docStatus === 'respinsa' ? '❌' : '⚠️'}
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
                            {biletActiv.tip === 'abonament' ? '📅 Abonament activ' : '🎫 Bilet activ'}
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
                            }}>✅ Reducere aplicată</span>
                        )}
                    </div>

                    <div className="home-qr-wrapper">
                        <div className="home-qr-glow" />

                        {/* Banner cooldown deasupra QR (doar abonament) */}
                        {biletActiv.tip === 'abonament' && cooldownSec > 0 && (
                            <div className="home-cooldown-banner">
                                <span className="home-cooldown-icon">⏳</span>
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
            ))}
        </div>
    );
}
