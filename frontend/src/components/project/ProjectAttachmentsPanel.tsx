import { Download, Paperclip, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SkeletonText } from '@/components/ui/Skeleton';
import { ApiError } from '@/lib/api';
import { formatDateTime, formatFileSize } from '@/lib/format';
import { projectAttachmentsService } from '@/services/project-attachments';
import { toast } from '@/stores/toast';
import type { ProjectAttachment, ProjectAttachmentSide } from '@/types/domain';

interface ProjectAttachmentsPanelProps {
  projectId: string;
  canUploadProducer: boolean;
  canUploadBank: boolean;
}

const SIDE_CONFIG: Record<
  ProjectAttachmentSide,
  { title: string; description: string; empty: string }
> = {
  PRODUCER: {
    title: 'Documentos do produtor',
    description: 'RG, comprovantes, matrículas e demais arquivos do produtor rural.',
    empty: 'Nenhum documento do produtor anexado.',
  },
  BANK: {
    title: 'Documentos do banco',
    description: 'Pareceres, condicionantes e documentos internos da análise de crédito.',
    empty: 'Nenhum documento do banco anexado.',
  },
};

export function ProjectAttachmentsPanel({
  projectId,
  canUploadProducer,
  canUploadBank,
}: ProjectAttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setAttachments(await projectAttachmentsService.list(projectId));
    } catch {
      toast.error('Não foi possível carregar os anexos do projeto.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const producerFiles = attachments.filter((a) => a.side === 'PRODUCER');
  const bankFiles = attachments.filter((a) => a.side === 'BANK');

  if (loading) {
    return (
      <Card className="p-5">
        <SkeletonText lines={4} />
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <AttachmentSection
        projectId={projectId}
        side="PRODUCER"
        files={producerFiles}
        canUpload={canUploadProducer}
        onChanged={() => void load()}
      />
      <AttachmentSection
        projectId={projectId}
        side="BANK"
        files={bankFiles}
        canUpload={canUploadBank}
        onChanged={() => void load()}
      />
    </div>
  );
}

function AttachmentSection({
  projectId,
  side,
  files,
  canUpload,
  onChanged,
}: {
  projectId: string;
  side: ProjectAttachmentSide;
  files: ProjectAttachment[];
  canUpload: boolean;
  onChanged: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const config = SIDE_CONFIG[side];

  async function handleUpload(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await projectAttachmentsService.upload(projectId, side, file);
      toast.success('Arquivo anexado.');
      onChanged();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível anexar o arquivo.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDownload(attachment: ProjectAttachment) {
    setDownloadingId(attachment.id);
    try {
      await projectAttachmentsService.download(projectId, attachment.id, attachment.fileName);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível baixar o arquivo.');
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(attachment: ProjectAttachment) {
    setDeletingId(attachment.id);
    try {
      await projectAttachmentsService.remove(projectId, attachment.id);
      toast.success('Anexo removido.');
      onChanged();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível remover o anexo.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-accent" />
            <p className="text-sm font-semibold text-text">{config.title}</p>
          </div>
          <p className="mt-1 text-xs text-text-tertiary">{config.description}</p>
        </div>
        {canUpload && (
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => void handleUpload(e.target.files)}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => inputRef.current?.click()}
              loading={uploading}
            >
              <Upload className="h-4 w-4" />
              Anexar
            </Button>
          </>
        )}
      </div>

      {files.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-text-tertiary">
          {config.empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-bg-subtle/40 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">{file.fileName}</p>
                <p className="text-[11px] text-text-tertiary">
                  {formatFileSize(file.sizeBytes)} · {file.uploadedBy.name} ·{' '}
                  {formatDateTime(file.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Baixar ${file.fileName}`}
                  onClick={() => void handleDownload(file)}
                  loading={downloadingId === file.id}
                >
                  <Download className="h-4 w-4" />
                </Button>
                {canUpload && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remover ${file.fileName}`}
                    onClick={() => void handleDelete(file)}
                    loading={deletingId === file.id}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
