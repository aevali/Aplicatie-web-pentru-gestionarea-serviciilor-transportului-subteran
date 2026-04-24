import { tipCalatorLabel } from '../dashboardConstants';

/* ─── Dropdown profil ─── */
export default function ProfileDropdown({ user, label, tipCont, rolEfectiv, onLogout, onNavigate }) {
    const initials = [user?.prenume?.[0], user?.nume?.[0]]
        .filter(Boolean).join('').toUpperCase() || (user?.email?.[0] ?? 'U').toUpperCase();

    const tipLabel = tipCont === 'calator'
        ? (tipCalatorLabel[user?.tip] ?? 'Călător')
        : label;

    return (
        <div className="profile-dropdown">
            <div className="pd-header">
                <div className="pd-avatar">{initials}</div>
                <div className="pd-info">
                    <p className="pd-name">
                        {user?.prenume && user?.nume
                            ? `${user.prenume} ${user.nume}`
                            : user?.email ?? 'Utilizator'}
                    </p>
                    <p className="pd-role">{tipLabel}</p>
                </div>
            </div>

            <div className="pd-divider" />

            {rolEfectiv === 'calator' && (
                <>
                    <div className="pd-menu">
                        <button className="pd-item" type="button" onClick={() => onNavigate('cont')}>
                            <span className="pd-item-icon">👤</span>
                            <span>Contul Meu</span>
                        </button>
                        <button className="pd-item" type="button" onClick={() => onNavigate('suport')}>
                            <span className="pd-item-icon">💬</span>
                            <span>Suport</span>
                        </button>
                    </div>

                    <div className="pd-divider" />
                </>
            )}

            <div className="pd-menu">
                <button className="pd-item pd-item--danger" type="button" onClick={onLogout}>
                    <span className="pd-item-icon">🚪</span>
                    <span>Deconectare</span>
                </button>
            </div>
        </div>
    );
}
