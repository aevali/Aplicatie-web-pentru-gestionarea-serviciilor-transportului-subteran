import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { API } from '../dashboardConstants';
import './PageHome.css';

/* ─── Pagina Home — călător ─── */
export default function PageHome({ user, token, onNavigate }) {
    const [biletActiv, setBiletActiv] = useState(undefined); // undefined = se încarcă

    useEffect(() => {
        if (!token) return;
        fetch(`${API}/api/bilete/activ`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => setBiletActiv(data.activ ?? null))
            .catch(() => setBiletActiv(null));
    }, [token]);

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
        }[biletActiv.tip] ?? biletActiv.tip;
        return `Abonament ${labelTip}`;
    };

    return (
        <div className="dash-section page-home">
            {/* Greeting */}
            <div className="home-greeting">
                <h2 className="dash-section-title">
                    Bun venit, <span>{user?.prenume ?? 'utilizator'}</span>!
                </h2>
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
                        <div className="home-qr-frame">
                            <QRCodeSVG
                                value={String(biletActiv.cod_qr)}
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
            ))}
        </div>
    );
}
