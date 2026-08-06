import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

interface DeleteProjectDialogProps {
  open: boolean;
  onClose: () => void;
  projectNumber: string;
  loading: boolean;
  onConfirm: () => void;
}

export function DeleteProjectDialog({
  open,
  onClose,
  projectNumber,
  loading,
  onConfirm,
}: DeleteProjectDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Excluir projeto"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Voltar
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-secondary">
        O projeto <span className="font-medium text-text">{projectNumber}</span> será removido
        permanentemente, incluindo assinaturas, histórico e anexos. Esta ação não pode ser
        desfeita.
      </p>
    </Dialog>
  );
}
