import { Plus, Search, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ProdutorFormDialog } from '@/components/produtores/ProdutorFormDialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { produtoresService } from '@/services/produtores';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/stores/toast';
import type { Produtor } from '@/types/domain';

const CLASSIFICACAO_LABEL: Record<string, string> = {
  PRONAF: 'PRONAF',
  PRONAMP: 'PRONAMP',
  DEMAIS: 'Demais',
};

export function Produtores() {
  const [produtores, setProdutores] = useState<Produtor[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const podeEditar = useAuthStore((s) => s.hasRole('ADMIN', 'AGRONOMO'));

  async function carregar(termo?: string) {
    setLoading(true);
    try {
      const { items } = await produtoresService.listar({ busca: termo, pageSize: 100 });
      setProdutores(items);
    } catch {
      toast.error('Não foi possível carregar os produtores.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => void carregar(busca || undefined), 350);
    return () => clearTimeout(timeout);
  }, [busca]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtores"
        description="Cadastro único — reutilizado em todas as safras."
        actions={
          podeEditar && (
            <Button size="sm" onClick={() => setDialogAberto(true)}>
              <Plus className="h-3.5 w-3.5" />
              Novo Produtor
            </Button>
          )
        }
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou CPF/CNPJ..."
          className="pl-9"
        />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <PageSpinner />
        ) : produtores.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Users}
              title="Nenhum produtor encontrado"
              description={busca ? 'Ajuste a busca ou cadastre um novo produtor.' : 'Cadastre o primeiro produtor.'}
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
              {produtores.map((produtor) => (
                <TableRow key={produtor.id}>
                  <TableCell className="font-medium">
                    <Link to={`/produtores/${produtor.id}`} className="hover:text-accent hover:underline">
                      {produtor.nome}
                    </Link>
                  </TableCell>
                  <TableCell className="text-text-secondary">{produtor.cpfCnpj}</TableCell>
                  <TableCell className="text-text-secondary">
                    {produtor.municipio}-{produtor.uf}
                  </TableCell>
                  <TableCell>
                    <Badge tone="accent">{CLASSIFICACAO_LABEL[produtor.classificacao]}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-text-secondary">
                    {produtor.propriedades.length}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ProdutorFormDialog
        open={dialogAberto}
        onClose={() => setDialogAberto(false)}
        onSaved={() => void carregar(busca || undefined)}
      />
    </div>
  );
}
