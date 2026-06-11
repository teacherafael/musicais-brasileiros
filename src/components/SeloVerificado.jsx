export default function SeloVerificado() {
  return (
    <span
      title="Usuário verificado"
      style={{
        display: "inline-flex",
        alignItems: "center",
        marginLeft: "5px",
        verticalAlign: "middle",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#1D9BF0">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
              stroke="#1D9BF0" strokeWidth="2" 
              fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 12l2 2 4-4" 
              stroke="white" strokeWidth="2" 
              fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}