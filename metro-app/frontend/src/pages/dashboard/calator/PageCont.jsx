import { useState, useEffect, useCallback } from 'react';
import { API, tipCalatorLabels, formatData } from '../dashboardConstants';
import UploadZone from '../components/UploadZone';
import { FileText, MessageCircle, Upload, ClipboardList, GraduationCap, School, House, Lock } from 'lucide-react';
import './PageCont.css';

export default function PageCont({ user, token, onDocStatusChange }) {
    const [cerere,          setCerere]          = useState(undefined);
    const [fisierBuletin,   setFisierBuletin]   = useState(null);
    const [fisierLegitimatie, setFisierLegitimatie] = useState(null);
    const [uploadLoad,      setUploadLoad]      = useState(false);
    const [uploadMsg,       setUploadMsg]       = useState(null);
    const [passForm,        setPassForm]        = useState({ parola_veche: '', parola_noua: '', confirmare: '' });
    const [passLoad,        setPassLoad]        = useState(false);
    const [passMsg,         setPassMsg]         = useState(null);
    const [passOpen,        setPassOpen]        = useState(false);

    const isAdult = user?.tip === 'adult';

    const fetchCerere = useCallback(async () => {
        try {
            const r = await fetch(`${API}/api/cont/verificare`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await r.json();
            setCerere(data.cerere ?? null);
            if (onDocStatusChange) onDocStatusChange(data.cerere ? data.cerere.status : null);
        } catch { setCerere(null); }
    }, [token, onDocStatusChange]);

    useEffect(() => { fetchCerere(); }, [fetchCerere]);

    const handleUpload = async () => {
        if (!fisierBuletin) return;
        setUploadLoad(true); setUploadMsg(null);
        const fd = new FormData();
        fd.append('documente', fisierBuletin);
        if (fisierLegitimatie) fd.append('documente', fisierLegitimatie);
        try {
            const r = await fetch(`${API}/api/cont/documente`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
            const data = await r.json();
            if (!r.ok) throw new Error(data.mesaj);
            setUploadMsg({ tip: 'ok', text: data.mesaj });
            setFisierBuletin(null);
            setFisierLegitimatie(null);
            await fetchCerere();
        } catch (e) { setUploadMsg({ tip: 'err', text: e.message }); }
        finally { setUploadLoad(false); }
    };

    const handlePassChange = async (e) => {
        e.preventDefault(); setPassMsg(null); setPassLoad(true);
        try {
            const r = await fetch(`${API}/api/cont/schimba-parola`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(passForm) });
            const data = await r.json();
            if (!r.ok) throw new Error(data.mesaj);
            setPassMsg({ tip: 'ok', text: data.mesaj });
            setPassForm({ parola_veche: '', parola_noua: '', confirmare: '' });
        } catch (e) { setPassMsg({ tip: 'err', text: e.message }); }
        finally { setPassLoad(false); }
    };

    const initials = [user?.prenume?.[0], user?.nume?.[0]].filter(Boolean).join('').toUpperCase() || '?';
    const canUpload = !cerere || cerere.status === 'respinsa';

    /* Status LED color */
    const statusLed = !cerere ? 'red' : cerere.status === 'in_asteptare' ? 'yellow' : cerere.status === 'aprobata' ? 'green' : 'red';
    const statusText = !cerere ? 'NEVERIFICAT' : cerere.status === 'in_asteptare' ? 'ÎN VERIFICARE' : cerere.status === 'aprobata' ? 'VERIFICAT' : 'RESPINS';

    return (
        <div className="dash-section cont-page">

            {/* ═══════ METRO PASS — Legitimație ═══════ */}
            <div className="metro-pass">
                <div className="metro-pass-stripe" />

                <div className="metro-pass-body">
                    <div className="metro-pass-left">
                        <div className="metro-pass-avatar">{initials}</div>
                        <div className={`metro-pass-led metro-pass-led--${statusLed}`} />
                    </div>

                    <div className="metro-pass-info">
                        <div className="metro-pass-org">METROBUCUREȘTI</div>
                        <div className="metro-pass-name">{user?.prenume} {user?.nume}</div>
                        <div className="metro-pass-detail">{user?.email}</div>

                        <div className="metro-pass-fields">
                            <div className="metro-pass-field">
                                <span className="metro-pass-field-label">TIP CONT</span>
                                <span className="metro-pass-field-value">{tipCalatorLabels[user?.tip] ?? '—'}</span>
                            </div>
                            <div className="metro-pass-field">
                                <span className="metro-pass-field-label">STATUS DOC.</span>
                                <span className={`metro-pass-field-value metro-pass-field-value--${statusLed}`}>{statusText}</span>
                            </div>
                        </div>
                    </div>

                    <div className="metro-pass-barcode">
                        <div className="metro-pass-barcode-lines">
                            {Array.from({ length: 24 }, (_, i) => (
                                <div key={i} className="metro-pass-barcode-line" style={{ height: `${12 + Math.random() * 18}px` }} />
                            ))}
                        </div>
                        <span className="metro-pass-id">ID {user?.id?.toString().padStart(6, '0') ?? '000000'}</span>
                    </div>
                </div>

                <div className="metro-pass-stripe metro-pass-stripe--bottom" />
            </div>

            {/* ═══════ STATUS BOARD — Panou LED ═══════ */}
            <div className="led-board">
                <div className="led-board-header">
                    <span className="led-board-dot" />
                    <span className="led-board-title">STATUS DOCUMENTE</span>
                </div>

                {cerere === undefined ? (
                    <div className="led-board-row"><span className="led-board-loading">SE ÎNCARCĂ...</span></div>
                ) : !cerere ? (
                    <div className="led-board-row">
                        <span className={`led-indicator led-indicator--red`} />
                        <span className="led-board-text">Niciun document trimis</span>
                        <span className="led-board-hint">Încarcă documentele pentru preț redus</span>
                    </div>
                ) : cerere.status === 'in_asteptare' ? (
                    <div className="led-board-row">
                        <span className="led-indicator led-indicator--yellow led-indicator--blink" />
                        <span className="led-board-text">Document în curs de verificare</span>
                        <span className="led-board-date">Trimis: {formatData(cerere.created_at)}</span>
                    </div>
                ) : cerere.status === 'aprobata' ? (
                    <div className="led-board-row">
                        <span className="led-indicator led-indicator--green" />
                        <span className="led-board-text">
                            Identitate confirmată — <strong>{tipCalatorLabels[cerere.tip_solicitat]}</strong>
                        </span>
                        <span className="led-board-date">Aprobat: {formatData(cerere.updated_at)}</span>
                    </div>
                ) : (
                    <>
                        <div className="led-board-row">
                            <span className="led-indicator led-indicator--red led-indicator--blink" />
                            <span className="led-board-text">Documente respinse</span>
                            <span className="led-board-date">Respins: {formatData(cerere.updated_at)}</span>
                        </div>
                        {cerere.motiv_respingere && (
                            <div className="led-board-reason"><MessageCircle size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> {cerere.motiv_respingere}</div>
                        )}
                    </>
                )}
            </div>

            {/* ═══════ UPLOAD — Scanner zone ═══════ */}
            {canUpload && (
                <div className="scanner-zone">
                    <div className="scanner-zone-header">
                        <span className="scanner-zone-icon"><FileText size={15} /></span>
                        <span className="scanner-zone-title">GHIȘEU DOCUMENTE</span>
                    </div>
                    <div className="scanner-zone-body">
                        <div style={{ display: 'grid', gridTemplateColumns: isAdult ? '1fr' : '1fr 1fr', gap: '0.85rem' }}>
                            <UploadZone label={<><FileText size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Buletin de identitate</>} sublabel="Obligatoriu — față + verso scanat" fisier={fisierBuletin} onSelect={setFisierBuletin} onClear={() => setFisierBuletin(null)} />
                            {!isAdult && (<UploadZone label={<><GraduationCap size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Legitimație / carnet</>} sublabel="Elev, student sau pensionar" fisier={fisierLegitimatie} onSelect={setFisierLegitimatie} onClear={() => setFisierLegitimatie(null)} optional />)}
                        </div>
                        {uploadMsg && (<div className={`cont-msg cont-msg--${uploadMsg.tip}`} style={{ marginTop: '0.5rem' }}>{uploadMsg.text}</div>)}
                        <div className="scanner-zone-actions">
                            <button className="ang-btn-primary" onClick={handleUpload} disabled={!fisierBuletin || uploadLoad}>
                                {uploadLoad ? 'Se trimite...' : <><Upload size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Trimite documente</>}
                            </button>
                        </div>
                    </div>
                    <div className="scanner-zone-scanline" />
                </div>
            )}

            {!canUpload && cerere?.status !== 'respinsa' && (
                <div className="led-board-note">
                    Poți re-trimite documentele doar după o respingere sau contactând direct un angajat.
                </div>
            )}

            {/* ═══════ REGULI — Info board ═══════ */}
            <div className="info-board">
                <div className="info-board-header">
                    <span className="info-board-icon"><ClipboardList size={15} /></span>
                    <span className="info-board-title">REGULI VALIDARE REDUCERI</span>
                </div>
                <p className="info-board-subtitle">Documentele trimise trebuie să respecte condițiile de mai jos.</p>

                <div className="info-board-scroll">
                    <div className="info-board-grid">
                        {[
                            {
                                tip: 'elev', Icon: School, titlu: 'Elev', reducere: '100% — gratuit',
                                reguli: [
                                    'Înscris la o <strong>școală / liceu din București</strong>',
                                    '<strong>Carnet de elev</strong> vizat pentru <strong>anul școlar curent</strong>',
                                    'Buletin de identitate — sau, sub <strong>14 ani</strong>, <strong>certificat de naștere</strong>',
                                ]
                            },
                            {
                                tip: 'student', Icon: GraduationCap, titlu: 'Student', reducere: '90%',
                                reguli: [
                                    'Înmatriculat la o <strong>facultate din București</strong>',
                                    '<strong>Legitimație de student</strong> vizată pentru <strong>anul universitar curent</strong>',
                                    'Buletin de identitate (față + verso)',
                                ]
                            },
                            {
                                tip: 'pensionar', Icon: House, titlu: 'Pensionar', reducere: '50%',
                                reguli: [
                                    '<strong>Domiciliu în București</strong> (conform buletin)',
                                    '<strong>Talon de pensie</strong> emis în <strong>ultimele 3 luni</strong>',
                                    'Buletin de identitate (față + verso)',
                                ]
                            },
                        ].map(cat => (
                            <div key={cat.tip} className={`info-board-category info-board-category--${cat.tip}`}>
                                <div className="info-board-cat-header">
                                    <span className="info-board-cat-icon"><cat.Icon size={20} /></span>
                                    <div>
                                        <div className="info-board-cat-name">{cat.titlu}</div>
                                        <div className="info-board-cat-pct">Reducere {cat.reducere}</div>
                                    </div>
                                </div>
                                <ul className="info-board-rules">
                                    {cat.reguli.map((r, i) => (
                                        <li key={i}>
                                            <span className={`info-board-rule-dot info-board-rule-dot--${cat.tip}`} />
                                            <span className="info-board-rule-text" dangerouslySetInnerHTML={{ __html: r }} />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══════ PAROLA — Accordion ═══════ */}
            <button className="pass-accordion-toggle" onClick={() => setPassOpen(!passOpen)}>
                <span className="pass-accordion-left">
                    <span className="pass-accordion-icon"><Lock size={15} /></span>
                    <span>Schimbă parola</span>
                </span>
                <span className={`pass-accordion-arrow ${passOpen ? 'open' : ''}`}>›</span>
            </button>

            {passOpen && (
                <div className="pass-accordion-body">
                    <form className="pass-accordion-form" onSubmit={handlePassChange} noValidate>
                        <div className="pass-field">
                            <label htmlFor="pass-veche">Parola actuală</label>
                            <input id="pass-veche" type="password" placeholder="Parola curentă" value={passForm.parola_veche} onChange={e => setPassForm(p => ({ ...p, parola_veche: e.target.value }))} />
                        </div>
                        <div className="pass-field">
                            <label htmlFor="pass-noua">Parolă nouă</label>
                            <input id="pass-noua" type="password" placeholder="Minim 8 caractere" value={passForm.parola_noua} onChange={e => setPassForm(p => ({ ...p, parola_noua: e.target.value }))} />
                        </div>
                        <div className="pass-field">
                            <label htmlFor="pass-conf">Confirmare parolă nouă</label>
                            <input id="pass-conf" type="password" placeholder="Repetă parola nouă" value={passForm.confirmare} onChange={e => setPassForm(p => ({ ...p, confirmare: e.target.value }))} />
                        </div>
                        {passMsg && <div className={`cont-msg cont-msg--${passMsg.tip}`}>{passMsg.text}</div>}
                        <button type="submit" className="ang-btn-primary" disabled={passLoad}>{passLoad ? 'Se salvează...' : <><Lock size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Schimbă parola</>}</button>
                    </form>
                </div>
            )}
        </div>
    );
}
