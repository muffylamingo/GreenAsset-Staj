import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import Button from './Button'
import Icon from './Icon'

/**
 * Onay modalı.
 *
 * Erişilebilirlik detayları (bunlar olmadan modal "çalışır ama doğru değildir"):
 *  - Esc ile kapanır
 *  - Açılınca odak modalın içine girer
 *  - Arka plan kaydırması kilitlenir
 *  - role="dialog" + aria-modal ekran okuyucuya "burası bir diyalog" der
 */
export default function Modal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  loading = false,
}) {
  const { t } = useTranslation()
  const onayButonu = useRef(null)

  useEffect(() => {
    if (!open) return

    const escDinleyici = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', escDinleyici)

    // Arka plan kaymasın
    const oncekiOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Odak modalın içine
    onayButonu.current?.focus()

    return () => {
      document.removeEventListener('keydown', escDinleyici)
      document.body.style.overflow = oncekiOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-inverse-surface/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-baslik"
        className="w-full max-w-md rounded-xl bg-surface-container-lowest p-gutter shadow-2xl"
        // Modalın içine tıklayınca kapanmasın
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 id="modal-baslik" className="text-headline-md text-on-surface">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        <p className="mb-6 text-body-md text-on-surface-variant">{message}</p>

        <div className="flex justify-end gap-stack-gap">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel ?? t('confirm.cancel')}
          </Button>
          <Button
            ref={onayButonu}
            variant={variant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel ?? t('confirm.confirm')}
          </Button>
        </div>
      </div>
    </div>
  )
}
