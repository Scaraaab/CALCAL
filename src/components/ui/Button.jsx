export default function Button({
  children,
  variant = 'primary', // primary | lime | ghost | danger
  size = 'md',         // sm | md | lg
  fullWidth = false,
  className = '',
  ...rest
}) {
  const base = {
    primary: 'btn-primary',
    lime:    'btn-lime',
    ghost:   'btn-ghost',
    danger:  'btn-danger'
  }[variant] || 'btn-primary';

  const sizeCls = {
    sm: 'text-sm px-4 py-2 rounded-xl',
    md: '',
    lg: 'text-base px-6 py-4'
  }[size] || '';

  return (
    <button
      {...rest}
      className={`${base} ${sizeCls} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
}
