import { ChevronLeft, ChevronRight, FileStack, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Select } from '@/components/ui/Input';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { formatCurrency, formatDate } from '@/lib/format';
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE } from '@/lib/projectStatus';
import { projectsService } from '@/services/projects';
import { toast } from '@/stores/toast';
import type { ProjectStatus, ProjectSummary } from '@/types/domain';

const PAGE_SIZE = 15;

export function History() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | ''>('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ProjectSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const result = await projectsService.list({
        search: search || undefined,
        status: status || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch {
      toast.error('Não foi possível carregar o histórico.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => void load(), search ? 350 : 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, page]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader title="Histórico" description="Todos os projetos emitidos — busque, filtre e reabra qualquer um." />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por produtor, CPF, fazenda ou número..."
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onChange={(next) => setStatus(next as ProjectStatus | '')}
          containerClassName="sm:w-56"
          placeholder="Todos os status"
          options={[
            { value: '', label: 'Todos os status' },
            ...(Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[]).map((s) => ({
              value: s,
              label: PROJECT_STATUS_LABEL[s],
            })),
          ]}
        />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <SkeletonTable rows={8} columns={7} />
        ) : items.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={FileStack}
              title="Nenhum projeto encontrado"
              description="Ajuste a busca/filtro ou emita um novo projeto."
            />
          </div>
        ) : (
          <>
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Produtor</TableHead>
                  <TableHead>Propriedade</TableHead>
                  <TableHead>Safra</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead>Emitido em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/projects/${project.id}`}
                        className="rounded-sm transition-colors hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                      >
                        {project.number}
                      </Link>
                    </TableCell>
                    <TableCell>{project.producer.name}</TableCell>
                    <TableCell className="text-text-secondary">{project.property.name}</TableCell>
                    <TableCell className="text-text-secondary">{project.season.label}</TableCell>
                    <TableCell>
                      <Badge tone={PROJECT_STATUS_TONE[project.status]}>{PROJECT_STATUS_LABEL[project.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium tabular-nums">
                      {formatCurrency(project.totalRevenue)}
                    </TableCell>
                    <TableCell className="text-text-secondary">{formatDate(project.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-text-secondary">
              <span>
                {total} projeto{total === 1 ? '' : 's'} · página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Próxima
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
