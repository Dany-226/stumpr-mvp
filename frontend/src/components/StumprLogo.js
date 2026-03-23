const StumprLogo = ({ size = 24, className = "" }) => (
  <span
    className={className}
    style={{
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontSize: size,
      fontWeight: 800,
      letterSpacing: "-0.025em",
      lineHeight: 1,
      color: "#1a1a1a",
    }}
  >
    Stumpr<span style={{ color: "#0e6b63" }}>.</span>
  </span>
);

export default StumprLogo;
