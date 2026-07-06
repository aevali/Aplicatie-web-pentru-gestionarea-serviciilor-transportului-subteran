import { useState, useEffect, useCallback } from 'react';
import { Megaphone, ChevronDown, CheckCheck, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { API } from '../dashboardConstants';
import './PageAnunturiCalator.css';

/* ─── Constante nivel importanță ─── */
const NIVEL_META = {
    info:      { label: 'Informare', icon: Info,            color: '#2563eb', cls: 'anc-badge--info'      },
    important: { label: 'Important', icon: AlertTriangle,   color: '#f59e0b', cls: 'anc-badge--important'  },
    urgent:    { label: 'Urgent',    icon: AlertCircle,      color: '#ef4444', cls: 'anc-badge--urgent'     },
};

const FILTRE = [
    { id: 'toate',      label: 'Toate'        },
    { id: 'urgent',     label: 'Urgente'      },
    { id: 'important',  label: 'Importante'   },
    { id: 'info',       label: 'Informative'  },
];

/* ─── Helper timp relativ ─── */
const formatTimp = (ts) => {
    if (!ts) return '';
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return 'acum';
    if (diff < 3600) return `acum ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `acum ${Math.floor(diff / 3600)}h`;
    if (diff < 172800) return 'ieri';
    return new Date(ts).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' });
};

/* ─── Pagina Anunțuri — călător ─── */
export default function PageAnunturiCalator({ token }) {
    const [anunturi, setAnunturi]       = useState(undefined);
    const [filtru, setFiltru]           = useState('toate');
    const [expanded, setExpanded]       = useState({});
    const [markingAll, setMarkingAll]   = useState(false);

    const h = { Authorization: `Bearer ${token}` };

    /* ─── Fetch anunțuri ─── */
    const fetchAnunturi = useCallback(async () => {
        try {
            const r = await fetch(`${API}/api/anunturi`, { headers: h });
            const d = await r.json();
            setAnunturi(d.anunturi ?? []);
        } catch {
            setAnunturi([]);
        }
    }, [token]);

    useEffect(() => { fetchAnunturi(); }, [fetchAnunturi]);

    /* ─── Marchează un anunț ca citit ─── */
    const marcheazaCitit = useCallback(async (id) => {
        try {
            await fetch(`${API}/api/anunturi/${id}/citit`, {
                method: 'POST', headers: h,
            });
            setAnunturi(prev =>
                prev?.map(a => a.id_anunt === id ? { ...a, citit: true } : a)
            );
        } catch { /* silently fail */ }
    }, [token]);

    /* ─── Marchează toate ca citite ─── */
    const marcheazaToate = async () => {
        setMarkingAll(true);
        try {
            await fetch(`${API}/api/anunturi/marcheaza-toate`, {
                method: 'POST', headers: h,
            });
            setAnunturi(prev => prev?.map(a => ({ ...a, citit: true })));
        } catch { /* silently fail */ }
        setMarkingAll(false);
    };

    /* ─── Toggle expand + auto-citit ─── */
    const toggleExpand = (anunt) => {
        const isOpening = !expanded[anunt.id_anunt];
        setExpanded(prev => ({ ...prev, [anunt.id_anunt]: isOpening }));
        if (isOpening && !anunt.citit) {
            marcheazaCitit(anunt.id_anunt);
        }
    };

    /* ─── Filtrare ─── */
    const lista = Array.isArray(anunturi)
        ? anunturi.filter(a => filtru === 'toate' || a.nivel_importanta === filtru)
        : [];

    const nrNecitite = Array.isArray(anunturi)
        ? anunturi.filter(a => !a.citit).length
        : 0;

    /* ─── Loading ─── */
    if (anunturi === undefined) {
        return (
            <div className="dash-section anc-page">
                <div className="anc-loading">
                    <div className="ang-spinner" />
                    <p className="anc-loading-text">Se încarcă anunțurile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dash-section anc-page">
            {/* ─── Header ─── */}
            <div className="anc-header">
                <div className="anc-header-top">
                    <div className="anc-header-icon"><Megaphone size={28} /></div>
                    <div>
                        <h2 className="dash-section-title">Anunțuri</h2>
                        <p className="dash-section-sub">
                            {anunturi.length === 0
                                ? 'Niciun anunț disponibil'
                                : `${anunturi.length} ${anunturi.length === 1 ? 'anunț' : 'anunțuri'}${nrNecitite > 0 ? ` · ${nrNecitite} necitite` : ''}`
                            }
                        </p>
                    </div>
                </div>

                {/* ─── Filtre + buton marchează ─── */}
                <div className="anc-toolbar">
                    <div className="anc-filters">
                        {FILTRE.map(f => (
                            <button
                                key={f.id}
                                className={`anc-filter-pill ${filtru === f.id ? 'anc-filter-pill--active' : ''}`}
                                onClick={() => setFiltru(f.id)}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {nrNecitite > 0 && (
                        <button
                            className="anc-mark-all-btn"
                            onClick={marcheazaToate}
                            disabled={markingAll}
                        >
                            <CheckCheck size={15} />
                            <span>{markingAll ? 'Se marchează...' : 'Marchează toate ca citite'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ─── Lista anunțuri ─── */}
            {lista.length === 0 ? (
                <div className="anc-empty">
                    <div className="anc-empty-icon"><Megaphone size={40} /></div>
                    <h3 className="anc-empty-title">
                        {filtru === 'toate'
                            ? 'Niciun anunț momentan'
                            : 'Niciun anunț în această categorie'}
                    </h3>
                    <p className="anc-empty-desc">
                        {filtru === 'toate'
                            ? 'Nu există anunțuri publicate. Revino mai târziu.'
                            : 'Încearcă să selectezi un alt filtru pentru a vedea anunțurile disponibile.'}
                    </p>
                </div>
            ) : (
                <div className="anc-list">
                    {lista.map((anunt, i) => {
                        const meta = NIVEL_META[anunt.nivel_importanta] || NIVEL_META.info;
                        const Icon = meta.icon;
                        const isOpen = !!expanded[anunt.id_anunt];
                        const preview = anunt.continut?.length > 100
                            ? anunt.continut.slice(0, 100) + '...'
                            : anunt.continut;

                        return (
                            <div
                                key={anunt.id_anunt}
                                className={`anc-card ${isOpen ? 'anc-card--open' : ''} ${!anunt.citit ? 'anc-card--unread' : ''}`}
                                style={{
                                    borderLeftColor: meta.color,
                                    animationDelay: `${i * 0.04}s`,
                                }}
                            >
                                {/* Card header */}
                                <button
                                    className="anc-card-header"
                                    onClick={() => toggleExpand(anunt)}
                                >
                                    <div className="anc-card-top-row">
                                        <div className="anc-card-badges">
                                            <span className={`anc-badge ${meta.cls}`}>
                                                <Icon size={13} />
                                                <span>{meta.label}</span>
                                            </span>
                                            {!anunt.citit && (
                                                <span className="anc-necitit">NECITIT</span>
                                            )}
                                        </div>
                                        <span className="anc-card-time">{formatTimp(anunt.creat)}</span>
                                    </div>

                                    <h4 className="anc-card-title">{anunt.titlu}</h4>

                                    <div className="anc-card-bottom-row">
                                        <span className="anc-card-author">
                                            {anunt.autor_prenume} {anunt.autor_nume}
                                        </span>
                                        <ChevronDown
                                            size={16}
                                            className={`anc-chevron ${isOpen ? 'anc-chevron--open' : ''}`}
                                        />
                                    </div>
                                </button>

                                {/* Collapsible content */}
                                <div className={`anc-card-body ${isOpen ? 'anc-card-body--open' : ''}`}>
                                    <div className="anc-card-body-inner">
                                        <p className="anc-card-content">{anunt.continut}</p>
                                    </div>
                                </div>

                                {/* Preview when collapsed */}
                                {!isOpen && anunt.continut && (
                                    <div className="anc-card-preview">
                                        <p>{preview}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
