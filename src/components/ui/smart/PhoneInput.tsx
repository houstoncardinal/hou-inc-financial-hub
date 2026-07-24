import { Phone } from 'lucide-react';

export function fmtPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
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
  iconColor?: string;
  required?: boolean;
}

export default function PhoneInput({
  value, onChange,
  placeholder = '(713) 000-0000',
  inputStyle, inputClassName,
  onFocus: externalFocus,
  onBlur: externalBlur,
  focusBorderColor = '#9D7E3F',
  defaultBorderColor = '#DDD4C4',
  showIcon = true,
  iconColor = '#8A7A6A',
  required,
}: Props) {
  return (
    <div style={{ position: 'relative' }}>
      {showIcon && (
        <Phone style={{
          position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
          width: 13, height: 13, color: iconColor, pointerEvents: 'none',
        }} strokeWidth={1.5} />
      )}
      <input
        type="tel"
        value={value}
        onChange={e => onChange(fmtPhone(e.target.value))}
        onFocus={e => {
          if (externalFocus) externalFocus(e);
          else e.target.style.borderColor = focusBorderColor;
        }}
        onBlur={e => {
          if (externalBlur) externalBlur(e);
          else e.target.style.borderColor = defaultBorderColor;
        }}
        placeholder={placeholder}
        autoComplete="tel"
        inputMode="tel"
        required={required}
        className={inputClassName}
        style={{
          paddingLeft: showIcon ? '2.75rem' : undefined,
          ...inputStyle,
        }}
      />
    </div>
  );
}
