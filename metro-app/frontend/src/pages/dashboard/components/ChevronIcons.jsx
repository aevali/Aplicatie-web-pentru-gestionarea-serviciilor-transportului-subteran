/* ─── Iconiță chevron SVG ─── */
export function ChevronIcon({ rotated }) {
    return (
        <svg
            className={`chevron-icon ${rotated ? 'rotated' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
        >
            <polyline points="15 18 9 12 15 6" />
        </svg>
    );
}

export function ChevronDownIcon({ rotated }) {
    return (
        <svg
            className={`chevron-down-icon ${rotated ? 'rotated' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            width="13" height="13" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
        >
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}
