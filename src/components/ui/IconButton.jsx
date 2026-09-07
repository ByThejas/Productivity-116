function IconButton({
  children,
  label,
  onClick,
  disabled = false,
  className = "",
}) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default IconButton;