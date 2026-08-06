import { Plus, Search, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ProducerFormDialog } from '@/components/producers/ProducerFormDialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { SkeletonTable } from '@/components/ui/Skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { producersService } from '@/services/producers';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/stores/toast';
import type { Producer } from '@/types/domain';

const CLASSIFICATION_LABEL: Record<string, string> = {
  PRONAF: 'PRONAF',
  PRONAMP: 'PRONAMP',
  OTHER: 'Demais',
};

export function Producers() {
  const [producers, setProducers] = useState<Producer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const canEdit = useAuthStore((s) => s.hasRole('ADMIN', 'AGRONOMIST'));

  async function load(term?: string) {
    setLoading(true);
    try {
      const { items } = await producersService.list({ search: term, pageSize: 100 });
      setProducers(items);
    } catch {
      toast.error('Não foi possível carregar os produtores.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => void load(search || undefined), 350);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtores"
        description="Cadastro único — reutilizado em todas as safras."
        actions={
          canEdit && (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Novo Produtor
            </Button>
          )
        }
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou CPF/CNPJ..."
          className="pl-9"
        />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <SkeletonTable rows={6} columns={5} />
        ) : producers.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Users}
              title="Nenhum produtor encontrado"
              description={
                search
                  ? 'Ajuste a busca ou cadastre um novo produtor.'
                  : 'Cadastre o primeiro produtor.'
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Município</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead className="text-right">Propriedades</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {producers.map((producer) => (
                <TableRow key={producer.id}>
                  <TableCell className="font-medium">
                    <Link
                      to={`/producers/${producer.id}`}
                      className="rounded-sm transition-colors hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                    >
                      {producer.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-text-secondary">{producer.taxId}</TableCell>
                  <TableCell className="text-text-secondary">
                    {producer.city}-{producer.state}
                  </TableCell>
                  <TableCell>
                    <Badge tone="accent">{CLASSIFICATION_LABEL[producer.classification]}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-text-secondary">
                    {producer.properties.length}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ProducerFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => void load(search || undefined)}
      />
    </div>
  );
}
