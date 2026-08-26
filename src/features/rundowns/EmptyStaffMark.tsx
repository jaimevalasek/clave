/** Assinatura do produto no estado vazio: a clave pousada sobre as linhas da pauta. */
export function EmptyStaffMark() {
  return (
    <svg className="pauta-vazia-svg" width="180" height="70" viewBox="0 0 180 70" aria-hidden="true">
      <g stroke="rgba(224,203,163,.25)" strokeWidth="1.5">
        <line x1="0" y1="8" x2="180" y2="8" />
        <line x1="0" y1="21" x2="180" y2="21" />
        <line x1="0" y1="34" x2="180" y2="34" />
        <line x1="0" y1="47" x2="180" y2="47" />
        <line x1="0" y1="60" x2="180" y2="60" />
      </g>
      <path
        d="M55 60 C 40 52, 40 30, 55 22 C 67 15, 79 22, 79 34 C 79 45, 68 50, 60 44"
        fill="none"
        stroke="#E8BA52"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".8"
      />
    </svg>
  );
}
