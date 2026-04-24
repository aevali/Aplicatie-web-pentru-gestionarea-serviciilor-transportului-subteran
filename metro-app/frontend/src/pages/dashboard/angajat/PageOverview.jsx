/* ─── Pagina Home — Admin & Angajat ─── */
export default function PageOverview({ user, rol }) {
    const cards = {
        angajat: [
            { icon: '✅', title: 'Bilete validate azi', value: '0',  sub: 'nicio validare' },
            { icon: '⏱️', title: 'Ore tură',            value: '0h', sub: 'tură neîncepută' },
        ],
        admin: [
            { icon: '👥', title: 'Angajați activi',    value: '—', sub: 'se încarcă...' },
            { icon: '🎫', title: 'Bilete vândute azi', value: '—', sub: 'se încarcă...' },
            { icon: '📈', title: 'Venituri totale',    value: '—', sub: 'se încarcă...' },
        ],
    };
    const items = cards[rol] ?? [];
    return (
        <div className="dash-section">
            <h2 className="dash-section-title">
                Bun venit, <span>{user?.prenume ?? 'utilizator'}</span>!
            </h2>
            <p className="dash-section-sub">
                {rol === 'angajat' && 'Activitate curentă a turei.'}
                {rol === 'admin'   && 'Vizualizare generală a sistemului.'}
            </p>
            <div className="dash-stats">
                {items.map(c => (
                    <div className="dash-stat-card" key={c.title}>
                        <div className="dash-stat-icon">{c.icon}</div>
                        <div className="dash-stat-body">
                            <p className="dash-stat-value">{c.value}</p>
                            <p className="dash-stat-label">{c.title}</p>
                            <p className="dash-stat-sub">{c.sub}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
