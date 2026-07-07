import { useState, useEffect, useCallback } from 'react';
import { Plus, Megaphone, Pencil, Trash2, X, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { API } from '../dashboardConstants';
import './PageAnunturi.css';

const NIVEL_CONFIG = {
    info:      { label: 'Informare', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.10)', border: 'rgba(37, 99, 235, 0.25)', icon: Info },
    important: { label: 'Important', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.10)', border: 'rgba(245, 158, 11, 0.25)', icon: AlertTriangle },
    urgent:    { label: 'Urgent',    color: '#ef4444', bg: 'rgba(239, 68, 68, 0.10)',  border: 'rgba(239, 68, 68, 0.25)',  icon: AlertCircle },
};

function formatDataAnunt(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const FORM_INIT = { titlu: '', continut: '', nivel_importanta: 'info' };

export default function PageAnunturi({ token }) {
    const [anunturi,    setAnunturi]    = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [eroare,      setEroare]      = useState('');
    const [successMsg,  setSuccessMsg]  = useState('');
    const [showModal,   setShowModal]   = useState(false);
    const [editId,      setEditId]      = useState(null);
    const [deleteId,    setDeleteId]    = useState(null);
    const [submitLoad,  setSubmitLoad]  = useState(false);

    const [form, setForm]           = useState(FORM_INIT);
    const [formEroare, setFormEroare] = useState('');

    /* ─── Fetch ─── */
    const fetchAnunturi = useCallback(async () => {
        setLoading(true);
        setEroare('');
        try {
            const r = await fetch(`${API}/api/anunturi`, { headers: { Authorization: `Bearer ${token}` } });
            if (!r.ok) throw new Error('Eroare la încărcarea anunțurilor.');
            const data = await r.json();
            setAnunturi(data.anunturi ?? []);
        } catch (e) { setEroare(e.message); }
        finally { setLoading(false); }
    }, [token]);

    useEffect(() => { fetchAnunturi(); }, [fetchAnunturi]);

    useEffect(() => {
        const open = showModal || deleteId !== null;
        document.body.style.overflow = open ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [showModal, deleteId]);

    /* ─── Helpers ─── */
    const openCreate = () => {
        setForm(FORM_INIT);
        setEditId(null);
        setFormEroare('');
        setShowModal(true);
    };

    const openEdit = (a) => {
        setForm({ titlu: a.titlu, continut: a.continut, nivel_importanta: a.nivel_importanta });
        setEditId(a.id_anunt);
        setFormEroare('');
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setEditId(null); setFormEroare(''); };

    const handleFormChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setFormEroare('');
    };

    /* ─── Create / Update ─── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormEroare('');
        if (!form.titlu.trim()) { setFormEroare('Titlul este obligatoriu.'); return; }
        if (!form.continut.trim()) { setFormEroare('Conținutul este obligatoriu.'); return; }
        setSubmitLoad(true);
        try {
            const isEdit = editId !== null;
            const url = isEdit ? `${API}/api/anunturi/${editId}` : `${API}/api/anunturi`;
            const method = isEdit ? 'PUT' : 'POST';
            const r = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(form),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.mesaj || `Eroare la ${isEdit ? 'actualizare' : 'creare'}.`);

            if (isEdit) {
                setAnunturi(prev => prev.map(a => a.id_anunt === editId ? { ...a, ...data } : a));
                setSuccessMsg('Anunț actualizat cu succes.');
            } else {
                setAnunturi(prev => [data, ...prev]);
                setSuccessMsg('Anunț creat cu succes.');
            }
            closeModal();
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (e) { setFormEroare(e.message); }
        finally { setSubmitLoad(false); }
    };

    /* ─── Delete ─── */
    const handleStergere = async (id) => {
        try {
            const r = await fetch(`${API}/api/anunturi/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            const data = await r.json();
            if (!r.ok) throw new Error(data.mesaj || 'Eroare la ștergere.');
            setAnunturi(prev => prev.filter(a => a.id_anunt !== id));
            setDeleteId(null);
            setSuccessMsg('Anunț șters cu succes.');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (e) { setEroare(e.message); setDeleteId(null); }
    };

    const deleteTarget = anunturi.find(a => a.id_anunt === deleteId);

    return (
        <div className="dash-section ana-page">
            {/* ─── Header ─── */}
            <div className="ana-header">
                <div>
                    <h2 className="dash-section-title">Anunțuri</h2>
                    <p className="dash-section-sub">{anunturi.length} anunț{anunturi.length !== 1 ? 'uri' : ''} publicat{anunturi.length !== 1 ? 'e' : ''}</p>
                </div>
                <button className="ang-btn-primary" onClick={openCreate}><Plus size={16} /> Anunț nou</button>
            </div>

            {/* ─── Toasts ─── */}
            {successMsg && <div className="ana-toast ana-toast--success">{successMsg}</div>}
            {eroare      && <div className="ana-toast ana-toast--error">{eroare}</div>}

            {/* ─── Content ─── */}
            {loading ? (
                <div className="ang-loading"><div className="ang-spinner" /><span>Se încarcă anunțurile...</span></div>
            ) : anunturi.length === 0 ? (
                <div className="ana-empty">
                    <div className="ana-empty-icon"><Megaphone size={36} /></div>
                    <p className="ana-empty-title">Niciun anunț publicat</p>
                    <p className="ana-empty-sub">Apasă „Anunț nou" pentru a crea primul anunț.</p>
                </div>
            ) : (
                <div className="ana-cards">
                    {anunturi.map((a, idx) => {
                        const cfg = NIVEL_CONFIG[a.nivel_importanta] || NIVEL_CONFIG.info;
                        const Icon = cfg.icon;
                        return (
                            <div
                                className="ana-card"
                                key={a.id_anunt}
                                style={{ borderLeftColor: cfg.color, animationDelay: `${idx * 0.04}s` }}
                            >
                                <div className="ana-card-top">
                                    <span
                                        className="ana-level-badge"
                                        style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.color }}
                                    >
                                        <Icon size={13} />
                                        {cfg.label}
                                    </span>
                                    <div className="ana-card-actions">
                                        <button className="ana-btn-icon" onClick={() => openEdit(a)} title="Editează"><Pencil size={15} /></button>
                                        <button className="ana-btn-icon ana-btn-icon--danger" onClick={() => setDeleteId(a.id_anunt)} title="Șterge"><Trash2 size={15} /></button>
                                    </div>
                                </div>
                                <h4 className="ana-card-title">{a.titlu}</h4>
                                <p className="ana-card-content">{a.continut}</p>
                                <div className="ana-card-meta">
                                    <span className="ana-card-date">{formatDataAnunt(a.creat)}</span>
                                    {(a.autor_prenume || a.autor_nume) && (
                                        <span className="ana-card-author">{a.autor_prenume} {a.autor_nume}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ─── Create / Edit Modal ─── */}
            {showModal && (
                <>
                    <div className="ana-modal-backdrop" onClick={closeModal} />
                    <div className="ana-modal">
                        <div className="ana-modal-header">
                            <h3 className="ana-modal-title">{editId ? 'Editează anunț' : 'Anunț nou'}</h3>
                            <button className="ana-modal-close" onClick={closeModal}><X size={20} /></button>
                        </div>
                        <form className="ana-form" onSubmit={handleSubmit} noValidate>
                            <div className="ana-field">
                                <label htmlFor="ana-titlu">Titlu</label>
                                <input
                                    id="ana-titlu"
                                    name="titlu"
                                    value={form.titlu}
                                    onChange={handleFormChange}
                                    placeholder="Titlul anunțului"
                                    autoComplete="off"
                                    maxLength={200}
                                />
                            </div>
                            <div className="ana-field">
                                <label htmlFor="ana-continut">
                                    Conținut
                                    <span className="ana-char-count">{form.continut.length} / 2000</span>
                                </label>
                                <textarea
                                    id="ana-continut"
                                    name="continut"
                                    value={form.continut}
                                    onChange={handleFormChange}
                                    placeholder="Descrierea anunțului..."
                                    rows={5}
                                    maxLength={2000}
                                />
                            </div>
                            <div className="ana-field">
                                <label>Nivel importanță</label>
                                <div className="ana-level-selector">
                                    {Object.entries(NIVEL_CONFIG).map(([key, cfg]) => {
                                        const Icon = cfg.icon;
                                        const active = form.nivel_importanta === key;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                className={`ana-level-opt${active ? ' ana-level-opt--active' : ''}`}
                                                style={active ? { background: cfg.bg, borderColor: cfg.border, color: cfg.color } : {}}
                                                onClick={() => setForm(prev => ({ ...prev, nivel_importanta: key }))}
                                            >
                                                <Icon size={15} />
                                                {cfg.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            {formEroare && <p className="ana-form-error">{formEroare}</p>}
                            <div className="ana-form-actions">
                                <button type="button" className="ang-btn-secondary" onClick={closeModal}>Anulează</button>
                                <button type="submit" className="ang-btn-primary" disabled={submitLoad}>
                                    {submitLoad ? (editId ? 'Se salvează...' : 'Se creează...') : (editId ? 'Salvează' : 'Publică anunț')}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}

            {/* ─── Delete Confirmation ─── */}
            {deleteId !== null && (
                <>
                    <div className="ana-modal-backdrop" onClick={() => setDeleteId(null)} />
                    <div className="ana-modal ana-modal--sm">
                        <div className="ana-modal-header">
                            <h3 className="ana-modal-title">Confirmare ștergere</h3>
                            <button className="ana-modal-close" onClick={() => setDeleteId(null)}><X size={20} /></button>
                        </div>
                        <p className="ana-confirm-text">
                            Ești sigur că vrei să ștergi anunțul{' '}
                            <strong>{deleteTarget?.titlu}</strong>?
                            <br />Această acțiune este ireversibilă.
                        </p>
                        <div className="ana-form-actions" style={{ padding: '0 1.35rem 1.35rem' }}>
                            <button className="ang-btn-secondary" onClick={() => setDeleteId(null)}>Anulează</button>
                            <button className="ang-btn-danger" onClick={() => handleStergere(deleteId)}>
                                <Trash2 size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Șterge
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
