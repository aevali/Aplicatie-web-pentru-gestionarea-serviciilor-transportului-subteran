export default function PagePlaceholder({ icon, title, desc }) {

    return (
        <div className="dash-section dash-placeholder">
            <div className="placeholder-icon">{icon}</div>
            <h2 className="placeholder-title">{title}</h2>
            <p className="placeholder-desc">{desc}</p>
            <div className="placeholder-badge">În curând</div>
        </div>
    );
}
