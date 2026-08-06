import Icon from './Icon'

/**
 * Buton — tasarımdaki dört varyant.
 *
 * Sınıflar neden nesne içinde? Tailwind kaynak kodu metin olarak tarıyor;
 * `bg-${varyant}` yazsak sınıf hiç üretilmez. Tam metin olmak zorundalar.
 */

const VARYANTLAR = {
  primary:
    'bg-primary-container text-on-primary-container hover:brightness-110 shadow-sm',
  secondary:
    'bg-secondary-container text-on-secondary-container hover:brightness-105',
  outlined:
    'border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container',
  ghost: 'bg-transparent text-primary hover:bg-surface-container',
  danger: 'bg-error text-on-error hover:brightness-110',
}

const BOYUTLAR = {
  sm: 'h-8 px-3 gap-1.5 text-label-md',
  md: 'h-10 px-4 gap-2 text-label-md',
  lg: 'h-12 px-6 gap-2 text-label-md',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconFilled = false,
  fullWidth = false,
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center rounded-xl transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARYANTLAR[variant],
        BOYUTLAR[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <Icon name="refresh" className="animate-spin text-[18px]" />
      ) : (
        icon && <Icon name={icon} filled={iconFilled} className="text-[18px]" />
      )}
      {children}
    </button>
  )
}
