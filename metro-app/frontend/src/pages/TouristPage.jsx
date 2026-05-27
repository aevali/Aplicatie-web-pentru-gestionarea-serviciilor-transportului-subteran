import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import './TouristPage.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PLANS = [
    { zile: 1, pret: 6,  desc: 'Perfect for a quick visit', badge: null, icon: '⚡' },
    { zile: 2, pret: 12, desc: 'Ideal for a weekend', badge: null, icon: '🌙' },
    { zile: 3, pret: 16, desc: 'Most popular', badge: '★ Popular', icon: '🔥' },
    { zile: 4, pret: 20, desc: 'Extended discovery', badge: null, icon: '🧭' },
    { zile: 5, pret: 24, desc: 'Full week explorer', badge: null, icon: '🗺️' },
    { zile: 7, pret: 40, desc: 'Best value', badge: '💎 Best value', icon: '👑' },
];

const STEPS = [
    { label: 'Account', icon: '👤' },
    { label: 'Plan',    icon: '🎫' },
    { label: 'Station', icon: '🚇' },
    { label: 'Done!',   icon: '✅' },
];

export default function TouristPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);

    // Step 1 — credențiale
    const [email, setEmail] = useState('');
    const [parola, setParola] = useState('');
    const [tara, setTara] = useState('');
    const [pasaport, setPasaport] = useState('');
    const [showParola, setShowParola] = useState(false);

    // Step 2 — plan selectat
    const [selectedPlan, setSelectedPlan] = useState(null);

    // Step 3 — stație
    const [statii, setStatii] = useState([]);
    const [magistrale, setMagistrale] = useState({});
    const [selectedStatie, setSelectedStatie] = useState('');
    const [searchStatie, setSearchStatie] = useState('');

    // Step 4 — rezultat
    const [result, setResult] = useState(null);
    const [cardRidicat, setCardRidicat] = useState(false);

    // General
    const [eroare, setEroare] = useState('');
    const [loading, setLoading] = useState(false);

    // Fetch stații la mount
    useEffect(() => {
        axios.get(`${API}/api/statii`)
            .then(({ data }) => {
                setStatii(data.statii || []);
                setMagistrale(data.magistrale || {});
            })
            .catch(() => {});
    }, []);

    // ── Eye icons ──
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

    // ── Validare Step 1 ──
    const validStep1 = () => {
        setEroare('');
        if (!email || !parola || !tara || !pasaport) {
            setEroare('Please fill in all fields.');
            return false;
        }
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        if (!emailRegex.test(email)) {
            setEroare('Please enter a valid email address.');
            return false;
        }
        if (parola.length < 8) {
            setEroare('Password must be at least 8 characters.');
            return false;
        }
        if (tara.trim().length < 2) {
            setEroare('Please enter your country.');
            return false;
        }
        if (pasaport.trim().length < 4) {
            setEroare('Please enter a valid passport ID (min 4 characters).');
            return false;
        }
        return true;
    };

    const goNext = async () => {
        if (step === 0) {
            if (!validStep1()) return;

            // Verifică dacă există deja un cont
            setLoading(true);
            setEroare('');
            try {
                const { data } = await axios.post(`${API}/api/turisti/login`, {
                    email,
                    parola,
                });

                if (data.exista && data.pass) {
                    // Cont existent — sari direct la confirmare
                    setResult(data.pass);
                    setCardRidicat(data.pass.ridicat || false);
                    setStep(3);
                    setLoading(false);
                    return;
                }
            } catch (err) {
                if (err.response?.status === 401) {
                    setEroare(err.response.data.mesaj || 'Incorrect password for existing account.');
                    setLoading(false);
                    return;
                }
                // Dacă e altă eroare, continuă fluxul normal
            }
            setLoading(false);

            setStep(1);
            return;
        }

        if (step === 1 && selectedPlan === null) {
            setEroare('Please select a plan.');
            return;
        }
        if (step === 2 && !selectedStatie) {
            setEroare('Please select a pickup station.');
            return;
        }
        setEroare('');

        if (step === 2) {
            handleSubmit();
        } else {
            setStep(s => s + 1);
        }
    };

    const goBack = () => {
        setEroare('');
        setStep(s => Math.max(0, s - 1));
    };

    // ── Submit ──
    const handleSubmit = async () => {
        setLoading(true);
        setEroare('');
        try {
            const { data } = await axios.post(`${API}/api/turisti/register`, {
                email,
                parola,
                zile: PLANS[selectedPlan].zile,
                id_statie_ridicare: parseInt(selectedStatie),
                tara: tara.trim(),
                pasaport: pasaport.trim(),
            });
            setResult(data.pass);
            setStep(3);
        } catch (err) {
            setEroare(err.response?.data?.mesaj || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Stații filtrate ──
    const filteredStatii = statii.filter(s =>
        s.nume.toLowerCase().includes(searchStatie.toLowerCase())
    );

    // Grupează stațiile pe magistrale pentru display
    const statiiPerMagistrala = {};
    for (const [mag, stList] of Object.entries(magistrale)) {
        const filtered = stList
            .filter(s => s.nume.toLowerCase().includes(searchStatie.toLowerCase()))
            .sort((a, b) => a.pozitie - b.pozitie);
        if (filtered.length > 0) {
            statiiPerMagistrala[mag] = filtered;
        }
    }

    return (
        <div className="tourist-page">
            <div className="auth-metro-stripe" />
            <div className="auth-bg-pattern" />

            <div className="tourist-container">
                {/* Stepper */}
                <div className="tourist-stepper">
                    {STEPS.map((s, i) => (
                        <div key={i} className={`stepper-item ${i <= step ? 'active' : ''} ${i === step ? 'current' : ''}`}>
                            <div className="stepper-circle">
                                {i < step ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                ) : (
                                    <span>{s.icon}</span>
                                )}
                            </div>
                            <span className="stepper-label">{s.label}</span>
                            {i < STEPS.length - 1 && <div className="stepper-line" />}
                        </div>
                    ))}
                </div>

                {/* Card */}
                <div className="tourist-card">
                    {/* Header */}
                    <div className="tourist-header">
                        <div className="tourist-globe">🌍</div>
                        <h1 className="tourist-title">
                            {step === 0 && 'Welcome, Tourist!'}
                            {step === 1 && 'Choose Your Pass'}
                            {step === 2 && 'Pickup Station'}
                            {step === 3 && 'You\'re All Set!'}
                        </h1>
                        <p className="tourist-subtitle">
                            {step === 0 && 'Create your account to get started'}
                            {step === 1 && 'Select the plan that fits your stay'}
                            {step === 2 && 'Where will you pick up your metro card?'}
                            {step === 3 && 'Show this code at the station kiosk'}
                        </p>
                    </div>

                    {/* ── STEP 1: Credențiale ── */}
                    {step === 0 && (
                        <div className="tourist-form">
                            <div className="form-group">
                                <label htmlFor="tourist-email">Email</label>
                                <div className="input-wrap">
                                    <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                    </svg>
                                    <input
                                        id="tourist-email"
                                        type="email"
                                        placeholder="your@email.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="tourist-parola">Password</label>
                                <div className="input-wrap">
                                    <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    <input
                                        id="tourist-parola"
                                        type={showParola ? 'text' : 'password'}
                                        placeholder="min. 8 characters"
                                        value={parola}
                                        onChange={e => setParola(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className="eye-toggle"
                                        onClick={() => setShowParola(v => !v)}
                                        aria-label={showParola ? 'Hide password' : 'Show password'}
                                    >
                                        {showParola ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="tourist-tara">Country</label>
                                <div className="input-wrap">
                                    <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="2" y1="12" x2="22" y2="12" />
                                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                    </svg>
                                    <input
                                        id="tourist-tara"
                                        type="text"
                                        placeholder="e.g. Germany, France, Italy..."
                                        value={tara}
                                        onChange={e => setTara(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="tourist-pasaport">Passport ID</label>
                                <div className="input-wrap">
                                    <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 10h20" /><path d="M6 14h2" /><path d="M12 14h6" />
                                    </svg>
                                    <input
                                        id="tourist-pasaport"
                                        type="text"
                                        placeholder="e.g. AB1234567"
                                        value={pasaport}
                                        onChange={e => setPasaport(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 2: Plan selection ── */}
                    {step === 1 && (
                        <div className="tourist-plans">
                            {PLANS.map((plan, i) => (
                                <button
                                    key={plan.zile}
                                    className={`plan-card ${selectedPlan === i ? 'selected' : ''} ${plan.badge ? 'has-badge' : ''}`}
                                    onClick={() => { setSelectedPlan(i); setEroare(''); }}
                                    type="button"
                                >
                                    {plan.badge && <div className="plan-badge">{plan.badge}</div>}
                                    <div className="plan-icon">{plan.icon}</div>
                                    <div className="plan-days">
                                        {plan.zile} <span>{plan.zile === 1 ? 'day' : 'days'}</span>
                                    </div>
                                    <div className="plan-price">€{plan.pret}</div>
                                    <div className="plan-desc">{plan.desc}</div>
                                    {selectedPlan === i && (
                                        <div className="plan-check">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* ── STEP 3: Station selection ── */}
                    {step === 2 && (
                        <div className="tourist-station">
                            <div className="station-search">
                                <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search stations..."
                                    value={searchStatie}
                                    onChange={e => setSearchStatie(e.target.value)}
                                />
                            </div>

                            <div className="station-list">
                                {Object.entries(statiiPerMagistrala).sort().map(([mag, sList]) => (
                                    <div key={mag} className="station-group">
                                        <div className={`station-group-header mag-${mag.toLowerCase()}`}>
                                            <span className="mag-dot" />
                                            {mag}
                                        </div>
                                        {sList.map(s => (
                                            <button
                                                key={`${mag}-${s.id_statie}`}
                                                className={`station-item ${String(selectedStatie) === String(s.id_statie) ? 'selected' : ''}`}
                                                onClick={() => { setSelectedStatie(s.id_statie); setEroare(''); }}
                                                type="button"
                                            >
                                                <span className="station-name">{s.nume}</span>
                                                {s.este_nod && <span className="station-nod">🔄</span>}
                                                {String(selectedStatie) === String(s.id_statie) && (
                                                    <svg className="station-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                ))}
                                {Object.keys(statiiPerMagistrala).length === 0 && (
                                    <p className="station-empty">No stations found</p>
                                )}
                            </div>

                            {selectedStatie && (
                                <div className="station-selected-banner">
                                    🚇 Pickup: <strong>{statii.find(s => s.id_statie === selectedStatie)?.nume || selectedStatie}</strong>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── STEP 4: Confirmation ── */}
                    {step === 3 && result && (
                        <div className="tourist-confirmation">
                            <div className="confirmation-qr">
                                <QRCodeSVG
                                    value={result.cod_qr}
                                    size={180}
                                    level="H"
                                    bgColor="transparent"
                                    fgColor="#e8eaed"
                                    includeMargin={false}
                                />
                            </div>

                            <div className="confirmation-code">
                                <span className="code-label">Your pickup code</span>
                                <span className="code-value">{result.cod_ridicare}</span>
                            </div>

                            {/* Card collected checkbox */}
                            {(() => {
                                const achizitie = new Date(result.data_achizitie);
                                const acum = new Date();
                                const zileScurse = Math.floor((acum - achizitie) / (1000 * 60 * 60 * 24));
                                const autoRidicat = zileScurse >= 7;
                                const isRidicat = cardRidicat || autoRidicat;
                                const zileRamase = Math.max(0, 7 - zileScurse);

                                const handleToggle = async () => {
                                    if (isRidicat) return;
                                    try {
                                        await axios.put(`${API}/api/turisti/ridica/${result.id_pass}`);
                                        setCardRidicat(true);
                                        setResult(prev => ({ ...prev, ridicat: true }));
                                    } catch (err) {
                                        setEroare('Could not update status. Please try again.');
                                    }
                                };

                                return (
                                    <div className={`pickup-status ${isRidicat ? 'pickup-status--done' : 'pickup-status--pending'}`}>
                                        <label className="pickup-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={isRidicat}
                                                onChange={handleToggle}
                                                disabled={isRidicat}
                                                className="pickup-checkbox"
                                            />
                                            <span className="pickup-checkbox-custom">
                                                {isRidicat && (
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                )}
                                            </span>
                                            <span className="pickup-text">
                                                {isRidicat
                                                    ? (autoRidicat && !cardRidicat ? 'Auto-collected (7 days expired)' : 'Card collected ✓')
                                                    : 'Mark as card collected'
                                                }
                                            </span>
                                        </label>
                                        {!isRidicat && (
                                            <span className="pickup-deadline">
                                                {zileRamase} day{zileRamase !== 1 ? 's' : ''} left to pick up
                                            </span>
                                        )}
                                    </div>
                                );
                            })()}

                            <div className="confirmation-details">
                                <div className="detail-row">
                                    <span className="detail-label">Email</span>
                                    <span className="detail-value">{result.email}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Country</span>
                                    <span className="detail-value">{result.tara}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Passport</span>
                                    <span className="detail-value">{result.pasaport}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Plan</span>
                                    <span className="detail-value">{result.zile} {result.zile === 1 ? 'day' : 'days'}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Price</span>
                                    <span className="detail-value">€{Number(result.pret).toFixed(2)}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Pickup at</span>
                                    <span className="detail-value">{result.statie_nume}</span>
                                </div>
                            </div>

                            <div className="confirmation-instructions">
                                <h3>How to activate</h3>
                                <ol>
                                    <li>Go to <strong>{result.statie_nume}</strong> metro station</li>
                                    <li>Find the card kiosk in the station</li>
                                    <li>Scan the QR code or enter: <strong>{result.cod_ridicare}</strong></li>
                                    <li>Your pass starts from the moment of activation</li>
                                </ol>
                            </div>

                            <button
                                className="tourist-btn tourist-btn--secondary"
                                onClick={() => navigate('/auth')}
                            >
                                ← Back to Login
                            </button>
                        </div>
                    )}

                    {/* ── Error ── */}
                    {eroare && <p className="tourist-error">{eroare}</p>}

                    {/* ── Navigation buttons ── */}
                    {step < 3 && (
                        <div className="tourist-nav">
                            {step > 0 ? (
                                <button className="tourist-btn tourist-btn--ghost" onClick={goBack} type="button">
                                    ← Back
                                </button>
                            ) : (
                                <button className="tourist-btn tourist-btn--ghost" onClick={() => navigate('/auth')} type="button">
                                    ← Login
                                </button>
                            )}
                            <button
                                className="tourist-btn tourist-btn--primary"
                                onClick={goNext}
                                disabled={loading}
                                type="button"
                            >
                                {loading ? (
                                    <><span className="auth-spinner" /> Processing...</>
                                ) : step === 2 ? 'Confirm & Get Code' : 'Continue →'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <footer className="auth-footer">
                    <p className="auth-footer-copy">© 2026 MetroBucurești. Toate drepturile rezervate.</p>
                </footer>
            </div>
        </div>
    );
}
