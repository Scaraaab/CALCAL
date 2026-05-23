import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { label, hint, error, leftIcon, rightAction, className = '', ...rest },
  ref
) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <label className="label block">{label}</label>}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          {...rest}
          className={`input ${leftIcon ? 'pl-11' : ''} ${rightAction ? 'pr-12' : ''}`}
        />
        {rightAction && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightAction}</div>
        )}
      </div>
      {hint && !error && <p className="text-xs text-white/40 px-1">{hint}</p>}
      {error && <p className="text-xs text-rose-400 px-1">{error}</p>}
    </div>
  );
});

export default Input;
