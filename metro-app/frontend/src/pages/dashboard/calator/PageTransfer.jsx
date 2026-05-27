import { useState, useEffect, useCallback } from 'react';
import { API } from '../dashboardConstants';
import {
    ArrowLeftRight, Ticket, Search, CheckCircle, ChevronRight,
    AlertTriangle, User, Send, Minus, Plus, ArrowLeft, CreditCard
} from 'lucide-react';
import './PageTransfer.css';

export default function PageTransfer({ token, onNavigate }) {
    const [pas, setPas] = useState(1);

    // Pas 1 — bilete transferabile
    const [bilete, setBilete] = useState(undefined);
    const [loadingBilete, setLoadingBilete] = useState(true);
    const [biletSelectat, setBiletSelectat] = useState(null);

    // Pas 2 — căutare destinatar
    const [emailSearch, setEmailSearch] = useState('');
    const [searching, setSearching] = useState(false);
    const [destinatar, setDestinatar] = useState(null);
    const [destAreActiv, setDestAreActiv] = useState(false);
    const [searchErr, setSearchErr] = useState('');

    // Pas 3 — confirmare
    const [nrCalatorii, setNrCalatorii] = useState(1);
    const [transferLoading, setTransferLoading] = useState(false);
    const [transferMsg, setTransferMsg] = useState(null);

    // Succes
    const [transferSuccess, setTransferSuccess] = useState(null);

    // Fetch bilete transferabile
    const fetchBilete = useCallback(async () => {
        if (!token) return;
        setLoadingBilete(true);
        try {
            const r = await fetch(`${API}/api/bilete/bilete-transferabile`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await r.json();
            setBilete(data.bilete ?? []);
        } catch {
            setBilete([]);
        } finally {
            setLoadingBilete(false);
        }
    }, [token]);

    useEffect(() => { fetchBilete(); }, [fetchBilete]);

    // Căutare destinatar
    const handleSearch = async () => {
        if (!emailSearch.trim()) return;
        setSearching(true);
        setSearchErr('');
        setDestinatar(null);
        setDestAreActiv(false);

        try {
            const r = await fetch(
                `${API}/api/bilete/cauta-destinatar?email=${encodeURIComponent(emailSearch.trim())}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await r.json();

            if (!r.ok) {
                setSearchErr(data.mesaj || 'Eroare la căutare.');
                return;
            }

            if (!data.gasit) {
                setSearchErr(data.mesaj || 'Utilizatorul nu a fost găsit.');
                return;
            }

            setDestinatar(data.destinatar);
            if (data.are_activ) {
                setDestAreActiv(true);
                setSearchErr(data.mesaj || 'Utilizatorul are deja un titlu activ.');
            }
        } catch {
            setSearchErr('Eroare de conexiune. Încearcă din nou.');
        } finally {
            setSearching(false);
        }
    };

    // Transfer
    const handleTransfer = async () => {
        if (!biletSelectat || !destinatar || !nrCalatorii) return;
        setTransferLoading(true);
        setTransferMsg(null);

        try {
            const r = await fetch(`${API}/api/bilete/transfera`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    id_bilet: biletSelectat.id_bilet,
                    email_destinatar: destinatar.email,
                    numar_calatorii: nrCalatorii,
                }),
            });
            const data = await r.json();

            if (!r.ok) {
                setTransferMsg({ tip: 'err', text: data.mesaj || 'Eroare la transfer.' });
                return;
            }

            setTransferSuccess({
                mesaj: data.mesaj,
                destinatar: data.destinatar,
                nrCalatorii,
            });
        } catch {
            setTransferMsg({ tip: 'err', text: 'Eroare de conexiune. Încearcă din nou.' });
        } finally {
            setTransferLoading(false);
        }
    };

    // Reset complet
    const handleReset = () => {
        setPas(1);
        setBiletSelectat(null);
        setEmailSearch('');
        setDestinatar(null);
        setDestAreActiv(false);
        setSearchErr('');
        setNrCalatorii(1);
        setTransferMsg(null);
        setTransferSuccess(null);
        fetchBilete();
    };

    // Format date
    const formatDataScurt = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Dacă e succes
    if (transferSuccess) {
        return (
            <div className="dash-section transfer-page">
                <div className="transfer-success">
                    <div className="transfer-success-icon">
                        <CheckCircle size={32} />
                    </div>
                    <h3 className="transfer-success-title">Transfer realizat cu succes!</h3>
                    <p className="transfer-success-desc">
                        {transferSuccess.nrCalatorii} călători{transferSuccess.nrCalatorii !== 1 ? 'i' : 'e'}{' '}
                        {transferSuccess.nrCalatorii !== 1 ? 'au fost transferate' : 'a fost transferată'} către{' '}
                        <strong>{transferSuccess.destinatar.prenume} {transferSuccess.destinatar.nume}</strong>
                        {' '}({transferSuccess.destinatar.email}).
                    </p>
                    <button className="transfer-success-btn" onClick={handleReset}>
                        <ArrowLeftRight size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Transfer nou
                    </button>
                </div>
            </div>
        );
    }

    // Stepper header
    const renderStepper = () => (
        <div className="transfer-stepper">
            {[
                { nr: 1, label: 'Selectare bilet' },
                { nr: 2, label: 'Destinatar' },
                { nr: 3, label: 'Confirmare' },
            ].map((s, i) => (
                <div key={s.nr} style={{ display: 'contents' }}>
                    <div className={`transfer-step ${
                        pas === s.nr ? 'transfer-step--active' :
                        pas > s.nr ? 'transfer-step--done' : ''
                    }`}>
                        <div className="transfer-step-num">
                            {pas > s.nr ? <CheckCircle size={14} /> : s.nr}
                        </div>
                        <span className="transfer-step-label">{s.label}</span>
                    </div>
                    {i < 2 && (
                        <div className={`transfer-step-line ${pas > s.nr ? 'transfer-step-line--done' : ''}`} />
                    )}
                </div>
            ))}
        </div>
    );

    // PAS 1
    const renderPas1 = () => (
        <>
            <div className="transfer-section-label">
                <Ticket size={14} /> Selectează biletul din care transferi
            </div>

            {loadingBilete && (
                <div className="transfer-loading">
                    <div className="ang-spinner" />
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>Se încarcă biletele...</span>
                </div>
            )}

            {!loadingBilete && bilete?.length === 0 && (
                <div className="transfer-empty">
                    <div className="transfer-empty-icon"><Ticket size={36} /></div>
                    <h3 className="transfer-empty-title">Niciun bilet transferabil</h3>
                    <p className="transfer-empty-desc">Nu ai bilete active cu călătorii rămase. Cumpără un bilet pentru a putea transfera.</p>
                    <button className="transfer-empty-btn" onClick={() => onNavigate('cumparare')}>
                        <CreditCard size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Cumpără bilet
                    </button>
                </div>
            )}

            {!loadingBilete && bilete?.length > 0 && (
                <>
                    <div className="transfer-bilete-lista">
                        {bilete.map(b => (
                            <div
                                key={b.id_bilet}
                                className={`transfer-bilet-card ${biletSelectat?.id_bilet === b.id_bilet ? 'transfer-bilet-card--selected' : ''}`}
                                onClick={() => setBiletSelectat(b)}
                            >
                                <div className="transfer-bilet-icon">
                                    <Ticket size={18} />
                                </div>
                                <div className="transfer-bilet-info">
                                    <span className="transfer-bilet-tip">
                                        Bilet {b.numar_calatorii} călători{b.numar_calatorii !== 1 ? 'i' : 'e'}
                                    </span>
                                    <span className="transfer-bilet-meta">
                                        Cumpărat pe {formatDataScurt(b.data_achizitie)} • REF #{b.id_bilet?.toString().padStart(6, '0')}
                                    </span>
                                </div>
                                <div className="transfer-bilet-ramase">
                                    <span className="transfer-bilet-badge">
                                        {b.numar_calatorii_ramase} rămase
                                    </span>
                                </div>
                                <div className="transfer-bilet-check">
                                    {biletSelectat?.id_bilet === b.id_bilet && <CheckCircle size={14} />}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="transfer-actions">
                        <button
                            className="transfer-btn-next"
                            disabled={!biletSelectat}
                            onClick={() => { setPas(2); setNrCalatorii(1); }}
                        >
                            Continuă <ChevronRight size={16} />
                        </button>
                    </div>
                </>
            )}
        </>
    );

    // PAS 2
    const renderPas2 = () => (
        <>
            <div className="transfer-section-label">
                <Search size={14} /> Caută destinatarul după email
            </div>

            <div className="transfer-search-wrap">
                {!destinatar || destAreActiv ? (
                    <>
                        <div className="transfer-search-row">
                            <input
                                className="transfer-search-input"
                                type="email"
                                placeholder="Email destinatar..."
                                value={emailSearch}
                                onChange={e => { setEmailSearch(e.target.value); setSearchErr(''); }}
                                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                                disabled={searching}
                            />
                            <button
                                className="transfer-search-btn"
                                onClick={handleSearch}
                                disabled={searching || !emailSearch.trim()}
                            >
                                {searching ? (
                                    <><div className="ang-spinner" style={{ width: 14, height: 14 }} /> Caut...</>
                                ) : (
                                    <><Search size={14} /> Caută</>
                                )}
                            </button>
                        </div>

                        {searchErr && !destinatar && (
                            <div className="transfer-search-error">
                                <AlertTriangle size={14} /> {searchErr}
                            </div>
                        )}

                        {/* Destinatar găsit dar are titlu activ */}
                        {destinatar && destAreActiv && (
                            <div className="transfer-dest-card transfer-dest-card--warning">
                                <div className="transfer-dest-avatar transfer-dest-avatar--warning">
                                    {destinatar.prenume?.[0]}{destinatar.nume?.[0]}
                                </div>
                                <div className="transfer-dest-info">
                                    <span className="transfer-dest-name">{destinatar.prenume} {destinatar.nume}</span>
                                    <span className="transfer-dest-email">{destinatar.email}</span>
                                    <span style={{ fontSize: '0.7rem', color: '#fcd34d', marginTop: '0.15rem' }}>
                                        Are deja un titlu de călătorie activ
                                    </span>
                                </div>
                                <div className="transfer-dest-warning-icon">
                                    <AlertTriangle size={18} />
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="transfer-dest-card">
                            <div className="transfer-dest-avatar">
                                {destinatar.prenume?.[0]}{destinatar.nume?.[0]}
                            </div>
                            <div className="transfer-dest-info">
                                <span className="transfer-dest-name">{destinatar.prenume} {destinatar.nume}</span>
                                <span className="transfer-dest-email">{destinatar.email}</span>
                            </div>
                            <div className="transfer-dest-ok">
                                <CheckCircle size={18} />
                            </div>
                        </div>
                        <button
                            className="transfer-dest-change"
                            onClick={() => { setDestinatar(null); setDestAreActiv(false); setEmailSearch(''); setSearchErr(''); }}
                        >
                            Schimbă destinatar
                        </button>
                    </>
                )}
            </div>

            <div className="transfer-actions">
                <button className="transfer-btn-back" onClick={() => setPas(1)}>
                    <ArrowLeft size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Înapoi
                </button>
                <button
                    className="transfer-btn-next"
                    disabled={!destinatar || destAreActiv}
                    onClick={() => { setPas(3); setNrCalatorii(1); }}
                >
                    Continuă <ChevronRight size={16} />
                </button>
            </div>
        </>
    );

    // PAS 3
    const maxCalatorii = biletSelectat?.numar_calatorii_ramase ?? 1;

    const renderPas3 = () => (
        <div className="transfer-confirm-wrap">
            <div className="transfer-section-label">
                <Send size={14} /> Confirmă transferul
            </div>

            {/* Selector cantitate */}
            <div className="transfer-qty-section">
                <span className="transfer-qty-label">Câte călătorii transferi?</span>
                <div className="transfer-qty-row">
                    <button
                        className="transfer-qty-btn"
                        onClick={() => setNrCalatorii(n => Math.max(1, n - 1))}
                        disabled={nrCalatorii <= 1}
                    >
                        <Minus size={16} />
                    </button>
                    <span className="transfer-qty-value">{nrCalatorii}</span>
                    <button
                        className="transfer-qty-btn"
                        onClick={() => setNrCalatorii(n => Math.min(maxCalatorii, n + 1))}
                        disabled={nrCalatorii >= maxCalatorii}
                    >
                        <Plus size={16} />
                    </button>
                    <span className="transfer-qty-max">din {maxCalatorii} disponibile</span>
                </div>
                {maxCalatorii > 1 && (
                    <input
                        type="range"
                        className="transfer-qty-slider"
                        min={1}
                        max={maxCalatorii}
                        value={nrCalatorii}
                        onChange={e => setNrCalatorii(parseInt(e.target.value, 10))}
                    />
                )}
            </div>

            {/* Rezumat */}
            <div className="transfer-summary">
                <div className="transfer-summary-title">Rezumat transfer</div>

                <div className="transfer-summary-row">
                    <span className="transfer-summary-label">Bilet sursă</span>
                    <span className="transfer-summary-dots" />
                    <span className="transfer-summary-value">
                        REF #{biletSelectat?.id_bilet?.toString().padStart(6, '0')}
                    </span>
                </div>

                <div className="transfer-summary-row">
                    <span className="transfer-summary-label">Călătorii transferate</span>
                    <span className="transfer-summary-dots" />
                    <span className="transfer-summary-value transfer-summary-value--accent">
                        {nrCalatorii} călători{nrCalatorii !== 1 ? 'i' : 'e'}
                    </span>
                </div>

                <div className="transfer-summary-row">
                    <span className="transfer-summary-label">Rămân în bilet</span>
                    <span className="transfer-summary-dots" />
                    <span className="transfer-summary-value">
                        {maxCalatorii - nrCalatorii} călători{(maxCalatorii - nrCalatorii) !== 1 ? 'i' : 'e'}
                    </span>
                </div>

                <div className="transfer-summary-row">
                    <span className="transfer-summary-label">Destinatar</span>
                    <span className="transfer-summary-dots" />
                    <span className="transfer-summary-value">
                        {destinatar?.prenume} {destinatar?.nume}
                    </span>
                </div>

                <div className="transfer-summary-row">
                    <span className="transfer-summary-label">Email</span>
                    <span className="transfer-summary-dots" />
                    <span className="transfer-summary-value">{destinatar?.email}</span>
                </div>
            </div>

            {transferMsg && (
                <div className={`transfer-msg transfer-msg--${transferMsg.tip}`}>
                    {transferMsg.tip === 'err' ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                    {transferMsg.text}
                </div>
            )}

            <div className="transfer-actions">
                <button className="transfer-btn-back" onClick={() => setPas(2)} disabled={transferLoading}>
                    <ArrowLeft size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Înapoi
                </button>
                <button
                    className="transfer-btn-confirm"
                    onClick={handleTransfer}
                    disabled={transferLoading}
                >
                    {transferLoading ? (
                        <><div className="ang-spinner" style={{ width: 14, height: 14, borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }} /> Se transferă...</>
                    ) : (
                        <><Send size={16} /> Confirmă transferul</>
                    )}
                </button>
            </div>
        </div>
    );

    return (
        <div className="dash-section transfer-page">
            <div className="transfer-header">
                <h2 className="transfer-title">
                    <ArrowLeftRight size={20} /> Transfer Bilete
                </h2>
                <p className="transfer-sub">Transferă călătorii din biletele tale către un alt utilizator</p>
            </div>

            {renderStepper()}

            {pas === 1 && renderPas1()}
            {pas === 2 && renderPas2()}
            {pas === 3 && renderPas3()}
        </div>
    );
}
