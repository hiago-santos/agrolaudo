import {
  ArrowLeft,
  Ban,
  ClipboardEdit,
  Copy,
  FileSpreadsheet,
  FileText,
  MoreHorizontal,
  Send,
  Trash2,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { LocationMapField } from '@/components/map/LocationMapField';
import { DeleteProjectDialog } from '@/components/project/DeleteProjectDialog';
import { BankReviewPanel } from '@/components/project/BankReviewPanel';
import { ProjectAttachmentsPanel } from '@/components/project/ProjectAttachmentsPanel';
import { ProjectStatusTimeline } from '@/components/project/ProjectStatusTimeline';
import { SignaturesPanel } from '@/components/project/SignaturesPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CompactCurrency } from '@/components/ui/Compact';
import { Dialog } from '@/components/ui/Dialog';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { Select } from '@/components/ui/Input';
import { SkeletonCards, SkeletonPageHeader, SkeletonTable } from '@/components/ui/Skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { ApiError } from '@/lib/api';
import { formatNumber, formatPercentage } from '@/lib/format';
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE } from '@/lib/projectStatus';
import { unitLabel } from '@/lib/units';
import { projectsService } from '@/services/projects';
import { seasonsService } from '@/services/seasons';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/stores/toast';
import type { Project, Season } from '@/types/domain';

const NON_TERMINAL: Project['status'][] = [
  'BANK_INITIATED',
  'DRAFT',
  'PENDING_SIGNATURES',
  'SIGNED',
  'UNDER_BANK_REVIEW',
  'AWAITING_PRODUCER_INFO',
];

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canEdit = useAuthStore((s) => s.hasRole('ADMIN', 'AGRONOMIST'));
  const canReview = useAuthStore((s) => s.hasRole('ADMIN', 'BANK'));
  const canAdjust = useAuthStore((s) => s.hasRole('ADMIN', 'AGRONOMIST', 'BANK'));
  const canUploadProducerAttachments = useAuthStore((s) => s.hasRole('ADMIN', 'AGRONOMIST'));
  const canUploadBankAttachments = useAuthStore((s) => s.hasRole('ADMIN', 'BANK'));

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [targetSeason, setTargetSeason] = useState('');
  const [duplicating, setDuplicating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      setProject(await projectsService.get(id));
    } catch {
      toast.error('Não foi possível carregar o projeto.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function openDuplicate() {
    setDuplicateOpen(true);
    if (seasons.length === 0) setSeasons(await seasonsService.list());
  }

  async function confirmDuplicate() {
    if (!id || !targetSeason) return;
    setDuplicating(true);
    try {
      const created = await projectsService.duplicate(id, targetSeason);
      toast.success(`Projeto ${created.number} criado a partir deste.`);
      navigate(`/projects/${created.id}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível duplicar o projeto.');
    } finally {
      setDuplicating(false);
      setDuplicateOpen(false);
    }
  }

  async function cancel() {
    if (!id) return;
    setCancelling(true);
    try {
      await projectsService.cancel(id);
      toast.success('Projeto cancelado.');
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível cancelar o projeto.');
    } finally {
      setCancelling(false);
    }
  }

  async function confirmDelete() {
    if (!id || !project) return;
    setDeleting(true);
    try {
      await projectsService.remove(id);
      toast.success(`Projeto ${project.number} excluído.`);
      navigate('/projects');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível excluir o projeto.');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function submitForReview() {
    if (!id) return;
    setSubmitting(true);
    try {
      await projectsService.submitForReview(id);
      toast.success('Projeto enviado para análise do banco.');
      await load();
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : 'Não foi possível enviar o projeto para o banco.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonPageHeader />
        <SkeletonCards count={4} />
        <Card className="overflow-hidden">
          <SkeletonTable rows={5} columns={8} />
        </Card>
      </div>
    );
  }
  if (!project) return null;

  const canCancel = canEdit && NON_TERMINAL.includes(project.status);
  const canDelete = canEdit;
  const canSubmitForReview = canEdit && project.status === 'SIGNED';
  const canComplete = canEdit && project.status === 'BANK_INITIATED';

  return (
    <div className="space-y-6">
      <Link
        to="/projects"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para projetos
      </Link>

      <PageHeader
        title={project.number}
        description={`${project.producer.name} · ${project.property.name} · Safra ${project.season.label}`}
        actions={
          <>
            <Badge tone={PROJECT_STATUS_TONE[project.status]}>
              {PROJECT_STATUS_LABEL[project.status]}
            </Badge>
            <DropdownMenu
              label="Ações do projeto"
              align="right"
              triggerClassName="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-strong bg-transparent px-3 text-xs font-medium text-text hover:bg-bg-subtle"
              trigger={
                <>
                  <MoreHorizontal className="h-3.5 w-3.5" />
                  Ações
                </>
              }
            >
              <DropdownMenuItem
                onSelect={() => void projectsService.downloadXlsx(project.id, project.number)}
                icon={<FileSpreadsheet className="h-4 w-4" />}
              >
                Baixar XLSX
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => void projectsService.downloadPdf(project.id, project.number)}
                icon={<FileText className="h-4 w-4" />}
              >
                Baixar PDF
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem
                  onSelect={() => void openDuplicate()}
                  icon={<Copy className="h-4 w-4" />}
                >
                  Duplicar
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  onSelect={() => setDeleteOpen(true)}
                  icon={<Trash2 className="h-4 w-4" />}
                >
                  Excluir projeto
                </DropdownMenuItem>
              )}
            </DropdownMenu>
            {canComplete && (
              <Link
                to={`/projects/${project.id}/complete`}
                className={buttonVariants('primary', 'sm')}
              >
                <ClipboardEdit className="h-3.5 w-3.5" />
                Completar projeto
              </Link>
            )}
            {canSubmitForReview && (
              <Button size="sm" onClick={() => void submitForReview()} loading={submitting}>
                <Send className="h-3.5 w-3.5" />
                Enviar pro banco
              </Button>
            )}
            {canCancel && (
              <Button variant="danger" size="sm" onClick={() => void cancel()} loading={cancelling}>
                <Ban className="h-3.5 w-3.5" />
                Cancelar
              </Button>
            )}
          </>
        }
      />

      <Card className="p-5">
        <ProjectStatusTimeline status={project.status} wasBankInitiated={!!project.initiatedBy} />
      </Card>

      {project.financedAreaBoundary && (
        <Card className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-text">Área financiada</p>
            <span className="text-xs text-text-secondary">
              {project.financedAreaHectares && `${formatNumber(project.financedAreaHectares)} ha`}
              {project.initiatedBy && ` · aberto por ${project.initiatedBy.name}`}
            </span>
          </div>
          <LocationMapField
            boundary={project.financedAreaBoundary}
            referenceBoundary={project.property.boundary ?? null}
            referenceLabel="Contorno da propriedade"
            height="clamp(260px, 40vh, 440px)"
          />
        </Card>
      )}

      {project.status === 'BANK_INITIATED' ? (
        <Card className="p-5">
          <p className="text-sm text-text-secondary">
            Este projeto foi aberto pelo banco e ainda não tem atividades. Um engenheiro agrônomo
            precisa completá-lo antes de seguir pro fluxo de assinaturas.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Summary
              label="Faturamento Bruto"
              value={<CompactCurrency value={project.totalRevenue} />}
            />
            <Summary
              label="Custo de Produção"
              value={<CompactCurrency value={project.totalCost} />}
            />
            <Summary
              label="Receita Líquida"
              value={<CompactCurrency value={project.totalProfit} />}
              highlight
            />
            <Summary
              label="Margem Operacional"
              value={formatPercentage(project.profitMarginPercentage)}
            />
          </div>

          {(project.status === 'UNDER_BANK_REVIEW' ||
            project.status === 'AWAITING_PRODUCER_INFO' ||
            project.status === 'APPROVED' ||
            project.status === 'REJECTED') && (
            <BankReviewPanel
              project={project}
              canReview={canReview}
              canAdjust={canAdjust}
              onUpdated={() => void load()}
            />
          )}

          <div>
            <p className="mb-3 text-sm font-semibold text-text">Anexos</p>
            <ProjectAttachmentsPanel
              projectId={project.id}
              canUploadProducer={canUploadProducerAttachments}
              canUploadBank={canUploadBankAttachments}
            />
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-text">Assinaturas</p>
            <SignaturesPanel project={project} onUpdated={() => void load()} />
          </div>

          <Card className="overflow-hidden">
            <div className="border-b border-border bg-bg-subtle/50 px-5 py-2.5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Quadro de Produção
              </h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Atividade</TableHead>
                  <TableHead className="hidden w-[12%] sm:table-cell">Unid.</TableHead>
                  <TableHead className="hidden w-[10%] text-right md:table-cell">Área</TableHead>
                  <TableHead className="hidden w-[12%] text-right lg:table-cell">Prod.</TableHead>
                  <TableHead className="hidden w-[12%] text-right lg:table-cell">Total</TableHead>
                  <TableHead className="hidden w-[14%] text-right md:table-cell">Fat.</TableHead>
                  <TableHead className="hidden w-[14%] text-right sm:table-cell">Custo</TableHead>
                  <TableHead className="w-[28%] text-right sm:w-[18%]">Líquido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.activityName}</TableCell>
                    <TableCell className="hidden text-text-secondary sm:table-cell">
                      {unitLabel(item.unit)}
                    </TableCell>
                    <TableCell className="hidden text-right md:table-cell">
                      {formatNumber(item.areaHectares)}
                    </TableCell>
                    <TableCell className="hidden text-right lg:table-cell">
                      {formatNumber(item.productivity)}
                    </TableCell>
                    <TableCell className="hidden text-right lg:table-cell">
                      {formatNumber(item.totalProduction)}
                    </TableCell>
                    <TableCell className="hidden text-right md:table-cell">
                      <CompactCurrency value={item.grossRevenue} />
                    </TableCell>
                    <TableCell className="hidden text-right sm:table-cell">
                      <CompactCurrency value={item.totalCost} />
                    </TableCell>
                    <TableCell className="text-right font-medium text-accent">
                      <CompactCurrency value={item.netProfit} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {project.notes && (
        <Card className="p-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Observações
          </p>
          <p className="text-sm text-text-secondary">{project.notes}</p>
        </Card>
      )}

      <Dialog
        open={duplicateOpen}
        onClose={() => setDuplicateOpen(false)}
        title="Duplicar projeto para outra safra"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDuplicateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void confirmDuplicate()}
              disabled={!targetSeason}
              loading={duplicating}
            >
              Duplicar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            As áreas e produtividades são reaproveitadas; preço e custo são atualizados com a matriz
            de preços atual.
          </p>
          <Select
            value={targetSeason}
            onChange={setTargetSeason}
            placeholder="Selecione a safra de destino"
            options={seasons
              .filter((s) => s.id !== project.season.id)
              .map((season) => ({ value: season.id, label: season.label }))}
          />
        </div>
      </Dialog>

      <DeleteProjectDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        projectNumber={project.number}
        loading={deleting}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

function Summary({
  label,
  value,
  highlight,
}: {
  label: string;
  value: ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className="p-3 sm:p-4">
      <p className="text-[11px] font-medium text-text-secondary sm:text-xs">{label}</p>
      <p
        data-compact-host
        className={
          highlight
            ? 'mt-1 min-w-0 font-mono text-base font-semibold tabular-nums text-accent sm:text-xl'
            : 'mt-1 min-w-0 font-mono text-base font-semibold tabular-nums text-text sm:text-xl'
        }
      >
        {value}
      </p>
    </Card>
  );
}
