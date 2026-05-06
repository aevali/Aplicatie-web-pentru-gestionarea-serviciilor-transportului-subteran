import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { API, normalizeazaEmail } from '../dashboardConstants';
import './PageAngajati.css';

export default function PageAngajati() {
    const { user } = useAuth();
    const token = localStorage.getItem('token');

    const [angajati,    setAngajati]    = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [eroare,      setEroare]      = useState('');
    const [showModal,   setShowModal]   = useState(false);
    const [deleteId,    setDeleteId]    = useState(null);
    const [submitLoad,  setSubmitLoad]  = useState(false);
    const [successMsg,  setSuccessMsg]  = useState('');
    const [ratingMap,   setRatingMap]   = useState({});

    const [form, setForm] = useState({ nume: '', prenume: '', parola: '', rol: 'angajat' });
    const [formEroare, setFormEroare] = useState('');

    const emailPreview =
        form.prenume || form.nume
            ? `${normalizeazaEmail(form.prenume || '?')}.${normalizeazaEmail(form.nume || '?')}@metrou.ro`
            : '';

    const fetchAngajati = useCallback(async () => {
        setLoading(true);
        setEroare('');
        try {
            const headers = { Authorization: `Bearer ${token}` };

            const [rAngajati, rStat] = await Promise.all([
                fetch(`${API}/api/angajati`, { headers }),
                fetch(`${API}/api/angajati/statistici`, { headers }),
            ]);

            if (!rAngajati.ok) throw new Error('Eroare la încărcarea angajaților.');
            const dataAngajati = await rAngajati.json();
            setAngajati(dataAngajati);

            if (rStat.ok) {
                const dataStat = await rStat.json();
                const map = {};
                (dataStat ?? []).forEach(a => { map[a.id_angajat] = a; });
                setRatingMap(map);
            }
        } catch (e) { setEroare(e.message); }
        finally { setLoading(false); }
    }, [token]);

    useEffect(() => { fetchAngajati(); }, [fetchAngajati]);

    const handleFormChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setFormEroare('');
    };

    const handleCreare = async (e) => {
        e.preventDefault();
        setFormEroare('');
        if (!form.nume.trim() || !form.prenume.trim() || !form.parola) { setFormEroare('Toate câmpurile sunt obligatorii.'); return; }
        if (form.parola.length < 8) { setFormEroare('Parola trebuie să aibă minim 8 caractere.'); return; }
        setSubmitLoad(true);
        try {
            const r = await fetch(`${API}/api/angajati`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
            const data = await r.json();
            if (!r.ok) throw new Error(data.mesaj || 'Eroare la creare.');
            setAngajati(prev => [...prev, data]);
            setForm({ nume: '', prenume: '', parola: '', rol: 'angajat' });
            setShowModal(false);
            setSuccessMsg(`Cont creat: ${data.email}`);
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (e) { setFormEroare(e.message); }
        finally { setSubmitLoad(false); }
    };

    const handleStergere = async (id) => {
        try {
            const r = await fetch(`${API}/api/angajati/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            const data = await r.json();
            if (!r.ok) throw new Error(data.mesaj || 'Eroare la ștergere.');
            setAngajati(prev => prev.filter(a => a.id_angajat !== id));
            setDeleteId(null);
            setSuccessMsg('Angajat șters cu succes.');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (e) { setEroare(e.message); setDeleteId(null); }
    };

    return (
        <div className="dash-section ang-page">
            <div className="ang-header">
                <div>
                    <h2 className="dash-section-title">Gestionare Angajați</h2>
                    <p className="dash-section-sub">{angajati.length} angajat{angajati.length !== 1 ? 'i' : ''} înregistrat{angajati.length !== 1 ? 'i' : ''}</p>
                </div>
                <button className="ang-btn-primary" onClick={() => { setShowModal(true); setFormEroare(''); }}><span>＋</span> Cont nou</button>
            </div>

            {successMsg && <div className="ang-toast ang-toast--success">{successMsg}</div>}
            {eroare      && <div className="ang-toast ang-toast--error">{eroare}</div>}

            {loading ? (
                <div className="ang-loading"><div className="ang-spinner" /><span>Se încarcă angajații...</span></div>
            ) : angajati.length === 0 ? (
                <div className="ang-empty"><div className="ang-empty-icon">👤</div><p>Niciun angajat înregistrat.</p><p className="ang-empty-sub">Apasă „Cont nou" pentru a adăuga primul angajat.</p></div>
            ) : (
                <div className="ang-table-wrap">
                    <table className="ang-table">
                        <thead><tr><th>#</th><th>Nume complet</th><th>Email</th><th>Rol</th><th>Activitate</th><th>Acțiuni</th></tr></thead>
                        <tbody>
                            {angajati.map((a, idx) => (
                                <tr key={a.id_angajat} className={a.id_angajat === user?.id ? 'ang-row-self' : ''}>
                                    <td className="ang-td-idx">{idx + 1}</td>
                                    <td><div className="ang-name-cell"><div className="ang-avatar">{(a.prenume?.[0] ?? '?').toUpperCase()}{(a.nume?.[0] ?? '').toUpperCase()}</div><div><p className="ang-fullname">{a.prenume} {a.nume}</p>{a.id_angajat === user?.id && <span className="ang-you-badge">Tu</span>}</div></div></td>
                                    <td className="ang-td-email">{a.email}</td>
                                    <td><span className={`ang-rol-badge ang-rol-badge--${a.rol}`}>{a.rol === 'admin' ? '🛡️ Admin' : '👷 Angajat'}</span></td>
                                    <td>
                                        {(() => {
                                            const s = ratingMap[a.id_angajat];
                                            const totalTickete  = parseInt(s?.total_tickete  ?? 0);
                                            const cuRating      = parseInt(s?.tickete_cu_rating ?? 0);
                                            const medie         = parseFloat(s?.rating_mediu ?? 0);
                                            const totalCereri   = parseInt(s?.total_cereri   ?? 0);
                                            const aprobate      = parseInt(s?.cereri_aprobate ?? 0);
                                            const respinse      = parseInt(s?.cereri_respinse ?? 0);

                                            const areActivitate = totalTickete > 0 || totalCereri > 0;
                                            if (!areActivitate) return <span className="ang-soon-tag">Fără activitate</span>;

                                            return (
                                                <div className="ang-stat-cell">
                                                    {totalTickete > 0 && (
                                                        <div className="ang-rating-cell">
                                                            <div className="ang-rating-stars">
                                                                {'★'.repeat(Math.round(medie))}{'☆'.repeat(5 - Math.round(medie))}
                                                            </div>
                                                            <div className="ang-rating-details">
                                                                {cuRating > 0
                                                                    ? <span className="ang-rating-val">{medie.toFixed(1)} <span className="ang-rating-muted">/ 5</span></span>
                                                                    : <span className="ang-rating-muted">Fără rating</span>
                                                                }
                                                                <span className="ang-rating-tickets">
                                                                    {totalTickete} ticket{totalTickete !== 1 ? 'e' : ''}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {totalCereri > 0 && (
                                                        <div className="ang-cereri-cell">
                                                            <span className="ang-cereri-total">{totalCereri} cereri</span>
                                                            <div className="ang-cereri-pills">
                                                                {aprobate > 0 && <span className="ang-cereri-pill ang-cereri-pill--ok">✓ {aprobate}</span>}
                                                                {respinse > 0 && <span className="ang-cereri-pill ang-cereri-pill--rej">✗ {respinse}</span>}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td>{a.id_angajat !== user?.id ? (<button className="ang-btn-delete" onClick={() => setDeleteId(a.id_angajat)} title="Șterge angajat">🗑️</button>) : (<span className="ang-no-delete">—</span>)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <>
                    <div className="ang-modal-backdrop" onClick={() => setShowModal(false)} />
                    <div className="ang-modal">
                        <div className="ang-modal-header"><h3 className="ang-modal-title">Cont angajat nou</h3><button className="ang-modal-close" onClick={() => setShowModal(false)}>✕</button></div>
                        {emailPreview && (<div className="ang-email-preview"><span className="ang-email-preview-label">Email generat automat:</span><span className="ang-email-preview-val">{emailPreview}</span></div>)}
                        <form className="ang-form" onSubmit={handleCreare} noValidate>
                            <div className="ang-form-row">
                                <div className="ang-field"><label htmlFor="prenume-ang">Prenume</label><input id="prenume-ang" name="prenume" value={form.prenume} onChange={handleFormChange} placeholder="ex. Ion" autoComplete="off" /></div>
                                <div className="ang-field"><label htmlFor="nume-ang">Nume</label><input id="nume-ang" name="nume" value={form.nume} onChange={handleFormChange} placeholder="ex. Popescu" autoComplete="off" /></div>
                            </div>
                            <div className="ang-field"><label htmlFor="parola-ang">Parolă temporară</label><input id="parola-ang" name="parola" type="password" value={form.parola} onChange={handleFormChange} placeholder="Minim 8 caractere" autoComplete="new-password" /></div>
                            <div className="ang-field"><label htmlFor="rol-ang">Rol</label><select id="rol-ang" name="rol" value={form.rol} onChange={handleFormChange}><option value="angajat">Angajat</option><option value="admin">Administrator</option></select></div>
                            {formEroare && <p className="ang-form-error">{formEroare}</p>}
                            <div className="ang-form-actions">
                                <button type="button" className="ang-btn-secondary" onClick={() => setShowModal(false)}>Anulează</button>
                                <button type="submit" className="ang-btn-primary" disabled={submitLoad}>{submitLoad ? 'Se creează...' : 'Creează cont'}</button>
                            </div>
                        </form>
                    </div>
                </>
            )}

            {deleteId !== null && (
                <>
                    <div className="ang-modal-backdrop" onClick={() => setDeleteId(null)} />
                    <div className="ang-modal ang-modal--sm">
                        <div className="ang-modal-header"><h3 className="ang-modal-title">Confirmare ștergere</h3><button className="ang-modal-close" onClick={() => setDeleteId(null)}>✕</button></div>
                        <p className="ang-confirm-text">Ești sigur că vrei să ștergi angajatul{' '}<strong>{angajati.find(a => a.id_angajat === deleteId)?.prenume}{' '}{angajati.find(a => a.id_angajat === deleteId)?.nume}</strong>?<br />Această acțiune este ireversibilă.</p>
                        <div className="ang-form-actions">
                            <button className="ang-btn-secondary" onClick={() => setDeleteId(null)}>Anulează</button>
                            <button className="ang-btn-danger" onClick={() => handleStergere(deleteId)}>🗑️ Șterge</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
