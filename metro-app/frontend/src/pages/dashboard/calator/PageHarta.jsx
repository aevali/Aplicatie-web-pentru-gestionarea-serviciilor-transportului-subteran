import { useState, useEffect, useRef } from 'react';
import { API } from '../dashboardConstants';
import './PageHarta.css';

const LINE_COLORS = {
    M1: '#FFD200', M2: '#2B78E4', M3: '#E4002B',
    M4: '#00A651', M5: '#F58220',
};
const LINE_NAMES = {
    M1: 'Pantelimon ↔ Dristor 2', M2: 'Pipera ↔ Berceni',
    M3: 'Preciziei ↔ Anghel Saligny', M4: 'Gara de Nord 2 ↔ Străulești',
    M5: 'Râul Doamnei ↔ Eroilor',
};

export default function PageHarta() {
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(true);

    const [startId, setStartId] = useState('');
    const [endId, setEndId] = useState('');
    const [startQuery, setStartQuery] = useState('');
    const [endQuery, setEndQuery] = useState('');
    const [showStartDrop, setShowStartDrop] = useState(false);
    const [showEndDrop, setShowEndDrop] = useState(false);

    const [result, setResult] = useState(null);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState('');

    const startRef = useRef(null);
    const endRef = useRef(null);

    useEffect(() => {
        fetch(`${API}/api/statii`)
            .then(r => r.json())
            .then(d => { setStations(d.statii || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e) => {
            if (startRef.current && !startRef.current.contains(e.target)) setShowStartDrop(false);
            if (endRef.current && !endRef.current.contains(e.target)) setShowEndDrop(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filterStations = (query) => {
        if (!query.trim()) return stations;
        const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return stations.filter(s => {
            const name = s.nume.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return name.includes(q);
        });
    };

    const selectStart = (s) => {
        setStartId(s.id_statie);
        setStartQuery(s.nume);
        setShowStartDrop(false);
        setError('');
        setResult(null);
    };

    const selectEnd = (s) => {
        setEndId(s.id_statie);
        setEndQuery(s.nume);
        setShowEndDrop(false);
        setError('');
        setResult(null);
    };

    const handleSwap = () => {
        setStartId(endId); setEndId(startId);
        setStartQuery(endQuery); setEndQuery(startQuery);
        setResult(null); setError('');
    };

    const handleSearch = async () => {
        if (!startId || !endId) { setError('Selectează ambele stații.'); return; }
        if (startId === endId) { setError('Stația de plecare și destinația trebuie să fie diferite.'); return; }

        setSearching(true); setError(''); setResult(null);
        try {
            const r = await fetch(`${API}/api/statii/ruta?start=${startId}&end=${endId}`);
            const d = await r.json();
            if (!r.ok) { setError(d.mesaj || 'Eroare la căutare.'); }
            else { setResult(d); }
        } catch { setError('Eroare de conexiune.'); }
        setSearching(false);
    };

    const handleClear = () => {
        setStartId(''); setEndId('');
        setStartQuery(''); setEndQuery('');
        setResult(null); setError('');
    };

    const getMagistraleForStation = (id) => {
        const s = stations.find(x => x.id_statie === id);
        return s?.magistrale?.map(m => m.magistrala) || [];
    };

    if (loading) {
        return (
            <div className="dash-section harta-page">
                <div className="ang-loading"><div className="ang-spinner" /> Se încarcă...</div>
            </div>
        );
    }

    return (
        <div className="dash-section harta-page">
            <h2 className="dash-section-title">🗺️ Planificator <span>Rută</span></h2>
            <p className="dash-section-sub">
                Selectează stația de plecare și destinația pentru a afla cel mai scurt traseu.
            </p>

            {/* ── Formular căutare ── */}
            <div className="ruta-search-card">
                <div className="ruta-search-fields">
                    {/* Start */}
                    <div className="ruta-field" ref={startRef}>
                        <label>
                            <span className="ruta-field-dot ruta-field-dot--start" />
                            Stația de plecare
                        </label>
                        <input
                            type="text"
                            placeholder="Caută stația..."
                            value={startQuery}
                            onChange={e => { setStartQuery(e.target.value); setStartId(''); setShowStartDrop(true); setResult(null); }}
                            onFocus={() => setShowStartDrop(true)}
                            autoComplete="off"
                        />
                        {showStartDrop && (
                            <div className="ruta-dropdown">
                                {filterStations(startQuery).map(s => (
                                    <button key={s.id_statie} className="ruta-dropdown-item" onClick={() => selectStart(s)}>
                                        <span className="ruta-dropdown-name">{s.nume}</span>
                                        <span className="ruta-dropdown-mags">
                                            {(s.magistrale || []).map(m => (
                                                <span key={m.magistrala} className="ruta-mag-dot" style={{ background: LINE_COLORS[m.magistrala] }}>
                                                    {m.magistrala}
                                                </span>
                                            ))}
                                        </span>
                                    </button>
                                ))}
                                {filterStations(startQuery).length === 0 && (
                                    <div className="ruta-dropdown-empty">Nicio stație găsită</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Swap button */}
                    <button className="ruta-swap-btn" onClick={handleSwap} title="Inversează" disabled={!startId && !endId}>
                        ⇅
                    </button>

                    {/* End */}
                    <div className="ruta-field" ref={endRef}>
                        <label>
                            <span className="ruta-field-dot ruta-field-dot--end" />
                            Stația de destinație
                        </label>
                        <input
                            type="text"
                            placeholder="Caută stația..."
                            value={endQuery}
                            onChange={e => { setEndQuery(e.target.value); setEndId(''); setShowEndDrop(true); setResult(null); }}
                            onFocus={() => setShowEndDrop(true)}
                            autoComplete="off"
                        />
                        {showEndDrop && (
                            <div className="ruta-dropdown">
                                {filterStations(endQuery).map(s => (
                                    <button key={s.id_statie} className="ruta-dropdown-item" onClick={() => selectEnd(s)}>
                                        <span className="ruta-dropdown-name">{s.nume}</span>
                                        <span className="ruta-dropdown-mags">
                                            {(s.magistrale || []).map(m => (
                                                <span key={m.magistrala} className="ruta-mag-dot" style={{ background: LINE_COLORS[m.magistrala] }}>
                                                    {m.magistrala}
                                                </span>
                                            ))}
                                        </span>
                                    </button>
                                ))}
                                {filterStations(endQuery).length === 0 && (
                                    <div className="ruta-dropdown-empty">Nicio stație găsită</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="ruta-search-actions">
                    <button className="ang-btn-primary" onClick={handleSearch} disabled={searching || !startId || !endId}>
                        {searching ? '⏳ Se calculează...' : '🔍 Caută ruta'}
                    </button>
                    {(startId || endId || result) && (
                        <button className="ang-btn-secondary" onClick={handleClear}>✕ Resetează</button>
                    )}
                </div>

                {error && <div className="cont-msg cont-msg--err">{error}</div>}
            </div>

            {/* ── Rezultat rută ── */}
            {result && (
                <div className="ruta-result" key={`${result.plecare}-${result.destinatie}`}>
                    {/* Stats */}
                    <div className="ruta-stats">
                        <div className="ruta-stat">
                            <span className="ruta-stat-value">{result.total_statii}</span>
                            <span className="ruta-stat-label">stații</span>
                        </div>
                        <div className="ruta-stat">
                            <span className="ruta-stat-value">{result.schimbari}</span>
                            <span className="ruta-stat-label">{result.schimbari === 1 ? 'schimbare' : 'schimbări'}</span>
                        </div>
                        <div className="ruta-stat">
                            <span className="ruta-stat-value">~{result.total_statii * 2} min</span>
                            <span className="ruta-stat-label">estimat</span>
                        </div>
                    </div>

                    {/* Journey */}
                    <div className="ruta-journey">
                        {result.ruta.map((segment, si) => {
                            const color = LINE_COLORS[segment.magistrala];
                            return (
                                <div key={si} className="ruta-segment">
                                    {/* Transfer indicator */}
                                    {si > 0 && (
                                        <div className="ruta-transfer">
                                            <div className="ruta-transfer-icon">🔄</div>
                                            <div className="ruta-transfer-text">
                                                <span>Schimbă la <strong>{segment.magistrala}</strong></span>
                                                <span className="ruta-transfer-sub">{LINE_NAMES[segment.magistrala]}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Line header */}
                                    <div className="ruta-segment-header" style={{ '--seg-color': color }}>
                                        <span className="ruta-segment-badge" style={{ background: color }}>
                                            {segment.magistrala}
                                        </span>
                                        <span className="ruta-segment-info">
                                            {segment.statii.length} {segment.statii.length === 1 ? 'stație' : 'stații'}
                                        </span>
                                    </div>

                                    {/* Station list */}
                                    <div className="ruta-segment-stations">
                                        {segment.statii.map((st, stIdx) => {
                                            const isFirst = stIdx === 0;
                                            const isLast = stIdx === segment.statii.length - 1;
                                            const isTerminal = (si === 0 && isFirst) || (si === result.ruta.length - 1 && isLast);
                                            const mags = getMagistraleForStation(st.id_statie);

                                            return (
                                                <div
                                                    key={st.id_statie}
                                                    className={`ruta-station ${isTerminal ? 'terminal' : ''} ${st.este_nod ? 'node' : ''}`}
                                                >
                                                    <div className="ruta-station-track">
                                                        {!isLast && (
                                                            <div className="ruta-station-line" style={{ background: color }} />
                                                        )}
                                                        <div
                                                            className={`ruta-station-dot ${isTerminal ? 'is-terminal' : ''} ${st.este_nod ? 'is-node' : ''}`}
                                                            style={{
                                                                borderColor: color,
                                                                background: isTerminal ? color : (st.este_nod ? '#0a0e24' : color),
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="ruta-station-info">
                                                        <span className="ruta-station-name">{st.nume}</span>
                                                        {st.este_nod && mags.length > 1 && (
                                                            <span className="ruta-station-mags">
                                                                {mags.filter(m => m !== segment.magistrala).map(m => (
                                                                    <span key={m} className="ruta-mag-dot" style={{ background: LINE_COLORS[m] }}>
                                                                        {m}
                                                                    </span>
                                                                ))}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isTerminal && (
                                                        <span className="ruta-station-terminal-label">
                                                            {si === 0 && isFirst ? '🚩 Plecare' : '📍 Destinație'}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
