import { useState } from 'react';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputStyle?: React.CSSProperties;
  inputClassName?: string;
  /** If provided, overrides internal focus border handling */
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  /** If provided, overrides internal blur border handling */
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  focusBorderColor?: string;
  defaultBorderColor?: string;
  showIcon?: boolean;
  required?: boolean;
}

export default function EmailInput({
  value, onChange,
  placeholder = 'you@example.com',
  inputStyle, inputClassName,
  onFocus: externalFocus,
  onBlur: externalBlur,
  focusBorderColor = '#9D7E3F',
  defaultBorderColor = '#DDD4C4',
  showIcon = true,
  required,
}: Props) {
  const [touched, setTouched] = useState(false);
  const valid     = isValidEmail(value);
  const showCheck = value.length > 0 && valid;
  const showErr   = touched && value.length > 0 && !valid;

  return (
    <div style={{ position: 'relative' }}>
      {showIcon && (
        <Mail style={{
          position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
          width: 13, height: 13, color: '#8A7A6A', pointerEvents: 'none',
        }} strokeWidth={1.5} />
      )}
      <input
        type="email"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={e => {
          if (externalFocus) externalFocus(e);
          else e.target.style.borderColor = focusBorderColor;
        }}
        onBlur={e => {
          setTouched(true);
          if (externalBlur) externalBlur(e);
          else e.target.style.borderColor = defaultBorderColor;
        }}
        placeholder={placeholder}
        autoComplete="email"
        required={required}
        className={inputClassName}
        style={{
          paddingLeft: showIcon ? '2.75rem' : undefined,
          paddingRight: showCheck || showErr ? '2.5rem' : undefined,
          ...inputStyle,
        }}
      />
      {showCheck && (
        <CheckCircle style={{
          position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
          width: 13, height: 13, color: '#10b981', pointerEvents: 'none',
        }} strokeWidth={2} />
      )}
      {showErr && (
        <AlertCircle style={{
          position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
          width: 13, height: 13, color: '#ef4444', pointerEvents: 'none',
        }} strokeWidth={2} />
      )}
    </div>
  );
}
