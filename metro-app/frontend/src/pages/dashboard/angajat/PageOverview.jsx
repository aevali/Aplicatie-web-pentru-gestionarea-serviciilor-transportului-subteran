/* ─── Pagina Home — Admin & Angajat ─── */
import { CheckCircle, Clock, Users, Ticket, TrendingUp } from 'lucide-react';
export default function PageOverview({ user, rol }) {
    const cards = {
        angajat: [
            { Icon: CheckCircle, title: 'Bilete validate azi', value: '0',  sub: 'nicio validare' },
            { Icon: Clock, title: 'Ore tură',            value: '0h', sub: 'tură neîncepută' },
        ],
        admin: [
            { Icon: Users, title: 'Angajați activi',    value: '—', sub: 'se încarcă...' },
            { Icon: Ticket, title: 'Bilete vândute azi', value: '—', sub: 'se încarcă...' },
            { Icon: TrendingUp, title: 'Venituri totale',    value: '—', sub: 'se încarcă...' },
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
                        <div className="dash-stat-icon"><c.Icon size={24} /></div>
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
