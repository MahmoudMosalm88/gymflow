import { useTranslation } from 'react-i18next'
import Modal from './Modal'
import { Button } from './ui/button'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'default',
  onConfirm,
  onCancel
}: ConfirmDialogProps): JSX.Element {
  const { t } = useTranslation()

  return (
    <Modal title={title} onClose={onCancel} size="sm" closeLabel={t('common.close')}>
      <p className="text-muted-foreground mb-6">{message}</p>
      <div className="flex gap-3">
        <Button
          type="button"
          variant={variant === 'danger' ? 'destructive' : 'default'}
          onClick={onConfirm}
          className="flex-1"
        >
          {confirmLabel || t('common.confirm')}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          {cancelLabel || t('common.cancel')}
        </Button>
      </div>
    </Modal>
  )
}
