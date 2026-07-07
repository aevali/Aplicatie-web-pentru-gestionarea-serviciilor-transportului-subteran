import { useState, useEffect, useCallback } from 'react';
import { Globe, Plane, MapPin, Calendar, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { API, formatData } from '../dashboardConstants';
import './PageTuristi.css';

export default function PageTuristi() {
    const { user, token } = useAuth();

    const [passes,  setPasses]  = useState([]);
    const [loading, setLoading] = useState(true);
    const [eroare,  setEroare]  = useState('');
    const [search,  setSearch]  = useState('');

    const fetchPasses = useCallback(async () => {
        setLoading(true);
        setEroare('');
        try {
            const r = await fetch(`${API}/api/turisti/toate`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!r.ok) throw new Error('Eroare la încărcarea cererilor de turiști.');
            const data = await r.json();
            setPasses(data.passes ?? []);
        } catch (e) {
            setEroare(e.message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchPasses(); }, [fetchPasses]);

    // Filtrare
    const filtered = passes.filter(p => {
        const q = search.toLowerCase();
        return (
            p.email.toLowerCase().includes(q) ||
            p.tara.toLowerCase().includes(q) ||
            p.pasaport?.toLowerCase().includes(q) ||
            p.cod_ridicare.toLowerCase().includes(q) ||
            p.statie_nume.toLowerCase().includes(q)
        );
    });

    // Statistici rapide
    const totalPasses = passes.length;
    const ridicateCount = passes.filter(p => p.ridicat).length;
    const venituriTotal = passes.reduce((s, p) => s + Number(p.pret), 0);
    const tariUnice = [...new Set(passes.map(p => p.tara))].length;

    const statCards = [
        { icon: <Plane size={18} />, label: 'Total cereri',   value: totalPasses,   color: 'blue' },
        { icon: <MapPin size={18} />, label: 'Ridicate',       value: ridicateCount, color: 'green' },
        { icon: <Globe size={18} />,  label: 'Țări diferite',  value: tariUnice,     color: 'purple' },
        { icon: <Calendar size={18} />, label: 'Venituri',     value: `€${venituriTotal.toFixed(0)}`, color: 'amber' },
    ];

    const statusBadge = (p) => {
        if (p.ridicat) {
            if (p.data_expirare && new Date(p.data_expirare) < new Date(new Date().toDateString())) {
                return <span className="tur-status tur-status--expired">Expirat</span>;
            }
            return <span className="tur-status tur-status--active">Activ</span>;
        }
        return <span className="tur-status tur-status--pending">Neridicate</span>;
    };

    return (
        <div className="dash-section tur-page">
            <div className="ang-header">
                <div>
                    <h2 className="dash-section-title">Cereri Turiști</h2>
                    <p className="dash-section-sub">
                        {totalPasses} cerere{totalPasses !== 1 ? 'i' : ''} de tourist pass
                    </p>
                </div>
                <button className="ang-btn-primary" onClick={fetchPasses} disabled={loading}>
                    <RefreshCw size={14} className={loading ? 'tur-spin' : ''} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                    Reîncarcă
                </button>
            </div>

            {/* Stat cards */}
            <div className="tur-stats">
                {statCards.map((s, i) => (
                    <div key={i} className={`tur-stat-card tur-stat-card--${s.color}`}>
                        <div className="tur-stat-icon">{s.icon}</div>
                        <div className="tur-stat-info">
                            <span className="tur-stat-value">{s.value}</span>
                            <span className="tur-stat-label">{s.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {eroare && <div className="ang-toast ang-toast--error">{eroare}</div>}

            {/* Search */}
            <div className="tur-search-wrap">
                <Search size={16} className="tur-search-icon" />
                <input
                    type="text"
                    placeholder="Caută după email, țară, pașaport, cod, stație..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="tur-search-input"
                />
            </div>

            {loading ? (
                <div className="ang-loading"><div className="ang-spinner" /><span>Se încarcă cererile...</span></div>
            ) : filtered.length === 0 ? (
                <div className="ang-empty">
                    <div className="ang-empty-icon"><Globe size={36} /></div>
                    <p>{search ? 'Nicio cerere găsită pentru căutarea ta.' : 'Nicio cerere de tourist pass încă.'}</p>
                </div>
            ) : (
                <div className="ang-table-wrap">
                    <table className="ang-table tur-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Email</th>
                                <th>Țara</th>
                                <th>Pașaport</th>
                                <th>Plan</th>
                                <th>Preț</th>
                                <th>Stația</th>
                                <th>Cod ridicare</th>
                                <th>Status</th>
                                <th>Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((p, idx) => (
                                <tr key={p.id_pass}>
                                    <td className="ang-td-idx">{idx + 1}</td>
                                    <td className="ang-td-email">{p.email}</td>
                                    <td>
                                        <span className="tur-country">
                                            <Globe size={13} className="tur-country-icon" />
                                            {p.tara}
                                        </span>
                                    </td>
                                    <td className="tur-td-passport">{p.pasaport || '—'}</td>
                                    <td>
                                        <span className="tur-plan-badge">
                                            {p.zile} {p.zile === 1 ? 'zi' : 'zile'}
                                        </span>
                                    </td>
                                    <td className="tur-td-price">€{Number(p.pret).toFixed(0)}</td>
                                    <td>
                                        <span className="tur-station">
                                            <MapPin size={13} className="tur-station-icon" />
                                            {p.statie_nume}
                                        </span>
                                    </td>
                                    <td>
                                        <code className="tur-cod">{p.cod_ridicare}</code>
                                    </td>
                                    <td>{statusBadge(p)}</td>
                                    <td className="tur-td-date">{formatData(p.data_achizitie)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
