import { MagnifyingGlass, Plus, Users } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

import { ProducerFormDialog } from '@/components/producers/ProducerFormDialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CompactName } from '@/components/ui/Compact';
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
        <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
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
                <TableHead className="w-[40%] sm:w-[28%]">Nome</TableHead>
                <TableHead className="hidden w-[22%] sm:table-cell">CPF/CNPJ</TableHead>
                <TableHead className="w-[35%] sm:w-[22%]">Município</TableHead>
                <TableHead className="hidden w-[18%] md:table-cell">Classe</TableHead>
                <TableHead className="hidden w-[10%] text-right lg:table-cell">Props.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {producers.map((producer) => (
                <TableRow key={producer.id} to={`/producers/${producer.id}`}>
                  <TableCell className="font-medium">
                    <CompactName name={producer.name} />
                  </TableCell>
                  <TableCell className="hidden text-text-secondary sm:table-cell">
                    {producer.taxId}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    <span className="md:hidden">{producer.city}</span>
                    <span className="hidden md:inline">
                      {producer.city}-{producer.state}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge tone="accent">{CLASSIFICATION_LABEL[producer.classification]}</Badge>
                  </TableCell>
                  <TableCell className="hidden text-right text-text-secondary lg:table-cell">
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
