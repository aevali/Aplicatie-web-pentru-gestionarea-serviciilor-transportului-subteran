import { useState, useEffect, useCallback } from 'react';
import { API, LABEL_TIP_ABON, LABEL_REDUCERE, calcPretRedus } from '../dashboardConstants';
import { Ticket, Sparkle, Bell, RefreshCw, X, AlertTriangle, Trash2, CheckCircle, CreditCard, Sun, CalendarDays, Calendar, CalendarRange } from 'lucide-react';
import './PageBiletele.css';

export default function PageBiletele({ token, onNavigate }) {
    const [titluri,        setTitluri]        = useState(undefined);
    const [loading,        setLoading]        = useState(true);
    const [modal,          setModal]          = useState(null);
    const [actionLoad,     setActionLoad]     = useState(false);
    const [actionMsg,      setActionMsg]      = useState(null);
    const [tipReinnoieste, setTipReinnoieste] = useState(null);
    const [eligibil,       setEligibil]       = useState(null);

    const fetchTitluri = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const r = await fetch(`${API}/api/bilete/toate`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await r.json();
            // Nu goli lista existentă la un răspuns eronat — păstrează ultimele date bune
            if (r.ok) setTitluri(data.titluri ?? []);
        } catch { /* păstrează lista curentă la eroare de rețea */ }
        finally { setLoading(false); }
    }, [token]);

    useEffect(() => {
        if (!token) return;
        fetch(`${API}/api/bilete/eligibilitate`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => setEligibil(data))
            .catch(() => {});
    }, [token]);

    useEffect(() => {
        fetchTitluri();
        const iv = setInterval(fetchTitluri, 15000);
        const onVisible = () => { if (document.visibilityState === 'visible') fetchTitluri(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVisible); };
    }, [fetchTitluri]);

    useEffect(() => {
        document.body.style.overflow = modal ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [modal]);

    const calcPretOptiune = (pretBaza) => {
        if (!eligibil || !eligibil.reducere) return { pretFinal: pretBaza, redus: false, pretBaza };
        const pretRedus = calcPretRedus(pretBaza, eligibil.tip);
        return { pretFinal: pretRedus, redus: true, pretBaza };
    };

    const poateReinnoi = (titlu) => {
        if (titlu.tip !== 'abonament' || !titlu.este_activ) return false;
        const exp = new Date(titlu.data_expirare);
        const azi = new Date();
        const diff = Math.ceil((exp - azi) / (1000 * 60 * 60 * 24));
        return diff <= 3;
    };

    const zileRamase = (titlu) => {
        if (!titlu.data_expirare) return null;
        const exp = new Date(titlu.data_expirare);
        const azi = new Date();
        return Math.ceil((exp - azi) / (1000 * 60 * 60 * 24));
    };

    const handleAnulare = async () => {
        if (!modal) return;
        setActionLoad(true); setActionMsg(null);
        try {
            let url;
            if (modal.titlu.tip === 'bilet') { url = `${API}/api/bilete/${modal.titlu.id}/anuleaza`; }
            else { url = `${API}/api/bilete/abonament/${modal.titlu.id}/anuleaza`; }
            const r = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            const data = await r.json();
            if (!r.ok) throw new Error(data.mesaj);
            setActionMsg({ tip: 'ok', text: data.mesaj });
            setTimeout(() => { setModal(null); setActionMsg(null); fetchTitluri(); }, 1200);
        } catch (e) { setActionMsg({ tip: 'err', text: e.message }); }
        finally { setActionLoad(false); }
    };

    const handleReinnoieste = async () => {
        if (!modal || !tipReinnoieste) return;
        setActionLoad(true); setActionMsg(null);
        try {
            const r = await fetch(`${API}/api/bilete/abonament/${modal.titlu.id}/reinnoieste`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ tipNou: tipReinnoieste }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.mesaj);
            setActionMsg({ tip: 'ok', text: data.mesaj });
            setTimeout(() => { setModal(null); setActionMsg(null); setTipReinnoieste(null); fetchTitluri(); }, 1400);
        } catch (e) { setActionMsg({ tip: 'err', text: e.message }); }
        finally { setActionLoad(false); }
    };

    const handleCloseReinnoiModal = () => {
        if (!actionLoad) { setModal(null); setActionMsg(null); setTipReinnoieste(null); }
    };

    const formatData = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
    };
    const formatDataScurt = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };
    const formatPretVal = (v) => v % 1 === 0 ? `${v} lei` : `${Number(v).toFixed(2)} lei`;

    /* ── Render receipt ticket ── */
    const renderReceipt = (titlu) => {
        const activ = titlu.este_activ;
        const esteAbon = titlu.tip === 'abonament';
        const poateR = poateReinnoi(titlu);
        const zileR = esteAbon && activ ? zileRamase(titlu) : null;

        let titleText;
        if (esteAbon) {
            if (titlu.data_achizitie && titlu.data_expirare) {
                const start = new Date(titlu.data_achizitie);
                const end   = new Date(titlu.data_expirare);
                const zileTotal = Math.round((end - start) / (1000 * 60 * 60 * 24));
                titleText = zileTotal === 1 ? 'ABONAMENT 1 ZI' : `ABONAMENT ${zileTotal} ZILE`;
            } else {
                titleText = `ABONAMENT ${(LABEL_TIP_ABON[titlu.tip_abonament] ?? titlu.tip_abonament).toUpperCase()}`;
            }
        } else {
            titleText = `BILET ${titlu.numar_calatorii} CĂLĂTORI${titlu.numar_calatorii !== 1 ? 'I' : 'E'}`;
        }

        return (
            <div key={`${titlu.tip}-${titlu.id}`} className={`receipt ${activ ? 'receipt--activ' : 'receipt--inactiv'}`}>
                {/* Zigzag top */}
                <div className="receipt-zigzag receipt-zigzag--top" />

                {/* Header */}
                <div className="receipt-header">
                    <div className="receipt-logo">
                        <span className="receipt-logo-icon">M</span>
                        <span className="receipt-logo-text">MetroBucurești</span>
                    </div>
                    <div className={`receipt-status ${activ ? 'receipt-status--activ' : 'receipt-status--inactiv'}`}>
                        {activ ? (esteAbon ? '● ACTIV' : '● VALID') : (esteAbon ? 'EXPIRAT' : 'CONSUMAT')}
                    </div>
                </div>

                <div className="receipt-separator" />

                {/* Title */}
                <div className="receipt-title">{titleText}</div>

                {/* Body — receipt rows */}
                <div className="receipt-body">
                    <div className="receipt-row">
                        <span className="receipt-row-label">Preț</span>
                        <span className="receipt-row-dots" />
                        <span className="receipt-row-value">{formatPretVal(titlu.pret)}</span>
                    </div>

                    {titlu.reducere_aplicata && (
                        <div className="receipt-row receipt-row--discount">
                            <span className="receipt-row-label">Reducere</span>
                            <span className="receipt-row-dots" />
                            <span className="receipt-row-value"><Sparkle size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Aplicată</span>
                        </div>
                    )}

                    <div className="receipt-row">
                        <span className="receipt-row-label">Achiziție</span>
                        <span className="receipt-row-dots" />
                        <span className="receipt-row-value">{formatDataScurt(titlu.data_achizitie)}</span>
                    </div>

                    {esteAbon && (
                        <div className="receipt-row">
                            <span className="receipt-row-label">Expiră</span>
                            <span className="receipt-row-dots" />
                            <span className="receipt-row-value">{formatDataScurt(titlu.data_expirare)}</span>
                        </div>
                    )}

                    {!esteAbon && (
                        <div className="receipt-row">
                            <span className="receipt-row-label">Călătorii</span>
                            <span className="receipt-row-dots" />
                            <span className="receipt-row-value">{titlu.numar_calatorii_ramase} / {titlu.numar_calatorii}</span>
                        </div>
                    )}
                </div>

                {/* Progress bar for bilete */}
                {!esteAbon && (
                    <div className="receipt-progress">
                        <div className="receipt-progress-bar">
                            <div className="receipt-progress-fill" style={{ width: `${(titlu.numar_calatorii_ramase / titlu.numar_calatorii) * 100}%` }} />
                        </div>
                        <span className="receipt-progress-label">
                            {titlu.numar_calatorii_ramase === 0 ? 'Consumat' : `${titlu.numar_calatorii_ramase} călătorii rămase`}
                        </span>
                    </div>
                )}

                {/* Renewal / expire warning */}
                {poateR && (
                    <div className="receipt-alert">
                        <Bell size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> {zileR <= 0 ? 'Expiră azi!' : `Mai ${zileR === 1 ? 'e 1 zi' : `sunt ${zileR} zile`} — reînnoiește!`}
                    </div>
                )}

                {esteAbon && activ && !poateR && zileR !== null && (
                    <div className="receipt-row receipt-row--muted">
                        <span className="receipt-row-label">Reînnoire în</span>
                        <span className="receipt-row-dots" />
                        <span className="receipt-row-value">{zileR - 3} zi{zileR - 3 === 1 ? '' : 'le'}</span>
                    </div>
                )}

                <div className="receipt-separator" />

                {/* Footer */}
                <div className="receipt-footer">
                    <span className="receipt-ref">REF #{titlu.id?.toString().padStart(6, '0')}</span>
                    <span className="receipt-date">{formatData(titlu.data_achizitie)}</span>
                </div>

                {/* Actions */}
                {activ && (
                    <div className="receipt-actions">
                        {poateR && (
                            <button className="receipt-btn receipt-btn--renew" onClick={() => setModal({ tip: 'reinnoieste', titlu })}>
                                <RefreshCw size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> Reînnoiește
                            </button>
                        )}
                        <button className="receipt-btn receipt-btn--cancel" onClick={() => setModal({ tip: 'anulare', titlu })}>
                            <X size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> Anulează
                        </button>
                    </div>
                )}

                {/* Zigzag bottom */}
                <div className="receipt-zigzag receipt-zigzag--bottom" />
            </div>
        );
    };

    return (
        <div className="dash-section bilete-page">
            <div className="bilete-header">
                <h2 className="bilete-title"><Ticket size={20} style={{ display: 'inline', verticalAlign: 'middle' }} /> Biletele Mele</h2>
                <p className="bilete-sub">Istoricul biletelor și abonamentelor tale de metrou</p>
            </div>

            {loading && (<div className="notif-loading"><div className="ang-spinner" /><span>Se încarcă titlurile de călătorie...</span></div>)}

            {!loading && titluri?.length === 0 && (
                <div className="bilete-empty">
                    <div className="bilete-empty-icon"><Ticket size={36} /></div>
                    <h3 className="bilete-empty-title">Nicio călătorie înregistrată</h3>
                    <p className="bilete-empty-desc">Nu ai cumpărat niciun bilet sau abonament până acum.</p>
                    <button className="bilete-empty-btn" onClick={() => onNavigate('cumparare')}><CreditCard size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Cumpără primul bilet</button>
                </div>
            )}

            {!loading && titluri?.length > 0 && (
                <div className="bilete-lista">{titluri.map(t => renderReceipt(t))}</div>
            )}

            {/* ── Modal anulare ── */}
            {modal?.tip === 'anulare' && (
                <>
                    <div className="bilete-modal-backdrop" onClick={() => { if (!actionLoad) { setModal(null); setActionMsg(null); } }} />
                    <div className="bilete-modal bilete-modal--danger">
                        <div className="bilete-modal-top">
                            <span className="bilete-modal-icon"><AlertTriangle size={24} /></span>
                            <div className="bilete-modal-texts">
                                <p className="bilete-modal-title">Confirmare anulare</p>
                                <p className="bilete-modal-message">
                                    Ești sigur că vrei să anulezi{' '}
                                    <strong style={{ color: '#fca5a5' }}>
                                        {modal.titlu.tip === 'abonament' ? `abonamentul ${LABEL_TIP_ABON[modal.titlu.tip_abonament]}` : `biletul de ${modal.titlu.numar_calatorii} călători${modal.titlu.numar_calatorii !== 1 ? 'i' : 'e'}`}
                                    </strong>?{' '}Această acțiune este ireversibilă.
                                </p>
                            </div>
                        </div>
                        {actionMsg && (<div className={`cont-msg cont-msg--${actionMsg.tip}`}>{actionMsg.text}</div>)}
                        <div className="bilete-modal-actions">
                            <button className="ang-btn-secondary" onClick={() => { setModal(null); setActionMsg(null); }} disabled={actionLoad}>Înapoi</button>
                            <button className="ang-btn-danger" onClick={handleAnulare} disabled={actionLoad}>
                                {actionLoad ? 'Se anulează...' : <><Trash2 size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Confirmă anularea</>}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* ── Modal reînnoire ── */}
            {modal?.tip === 'reinnoieste' && (
                <>
                    <div className="bilete-modal-backdrop" onClick={handleCloseReinnoiModal} />
                    <div className="bilete-modal bilete-modal--reinnoieste">
                        <div className="bilete-modal-top">
                            <span className="bilete-modal-icon"><RefreshCw size={24} /></span>
                            <div className="bilete-modal-texts">
                                <p className="bilete-modal-title">Alege tipul de reînnoire</p>
                                <p className="bilete-modal-message">Data de expirare va fi prelungită cu perioada aleasă.</p>
                            </div>
                        </div>
                        <div className="reinnoi-optiuni">
                            {[
                                { key: 'zi',        label: '1 Zi',   Icon: Sun, pretBaza: 12  },
                                { key: 'trei_zile', label: '3 Zile', Icon: CalendarDays, pretBaza: 35  },
                                { key: 'saptamana', label: '7 Zile', Icon: Calendar, pretBaza: 45  },
                                { key: 'luna',      label: '1 Lună', Icon: CalendarRange, pretBaza: 100 },
                            ].map(opt => {
                                const { pretFinal, redus } = calcPretOptiune(opt.pretBaza);
                                return (
                                    <button key={opt.key} className={`reinnoi-card ${tipReinnoieste === opt.key ? 'reinnoi-card--selected' : ''}`} onClick={() => setTipReinnoieste(opt.key)} disabled={actionLoad}>
                                        <span className="reinnoi-card-icon"><opt.Icon size={18} /></span>
                                        <span className="reinnoi-card-label">{opt.label}</span>
                                        {redus ? (
                                            <>
                                                <span className="reinnoi-card-pret-vechi">{opt.pretBaza} lei</span>
                                                <span className="reinnoi-card-pret reinnoi-card-pret--redus">{pretFinal === 0 ? 'Gratuit' : `${pretFinal % 1 === 0 ? pretFinal : pretFinal.toFixed(2)} lei`}</span>
                                                <span className="reinnoi-card-badge-reducere">-{LABEL_REDUCERE[eligibil.tip]}</span>
                                            </>
                                        ) : (<span className="reinnoi-card-pret">{opt.pretBaza} lei</span>)}
                                    </button>
                                );
                            })}
                        </div>
                        {actionMsg && (<div className={`cont-msg cont-msg--${actionMsg.tip}`}>{actionMsg.text}</div>)}
                        <div className="bilete-modal-actions">
                            <button className="ang-btn-secondary" onClick={handleCloseReinnoiModal} disabled={actionLoad}>Anulează</button>
                            <button className="ang-btn-primary" onClick={handleReinnoieste} disabled={actionLoad || !tipReinnoieste}>
                                {actionLoad ? 'Se procesează...' : <><CheckCircle size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Prelungește abonamentul</>}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
