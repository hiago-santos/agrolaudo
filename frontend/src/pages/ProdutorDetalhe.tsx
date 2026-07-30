import { ArrowLeft, MapPin, Pencil, Plus, Sprout } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ProdutorFormDialog } from '@/components/produtores/ProdutorFormDialog';
import { PropriedadeFormDialog } from '@/components/propriedades/PropriedadeFormDialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatarNumero } from '@/lib/format';
import { produtoresService } from '@/services/produtores';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/stores/toast';
import type { Produtor, Propriedade } from '@/types/domain';

const CLASSIFICACAO_LABEL: Record<string, string> = {
  PRONAF: 'PRONAF',
  PRONAMP: 'PRONAMP',
  DEMAIS: 'Demais',
};

export function ProdutorDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [produtor, setProdutor] = useState<Produtor | null>(null);
  const [loading, setLoading] = useState(true);
  const [editarProdutor, setEditarProdutor] = useState(false);
  const [propriedadeEmEdicao, setPropriedadeEmEdicao] = useState<Propriedade | null>(null);
  const [novaPropriedadeAberta, setNovaPropriedadeAberta] = useState(false);
  const podeEditar = useAuthStore((s) => s.hasRole('ADMIN', 'AGRONOMO'));

  async function carregar() {
    if (!id) return;
    setLoading(true);
    try {
      setProdutor(await produtoresService.obter(id));
    } catch {
      toast.error('Não foi possível carregar o produtor.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <PageSpinner />;
  if (!produtor) return null;

  return (
    <div className="space-y-6">
      <Link
        to="/produtores"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-accent"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para produtores
      </Link>

      <PageHeader
        title={produtor.nome}
        description={`${produtor.cpfCnpj} · ${produtor.municipio}-${produtor.uf}`}
        actions={
          podeEditar && (
            <Button variant="outline" size="sm" onClick={() => setEditarProdutor(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-text-secondary">Classificação</p>
            <Badge tone="accent" className="mt-2">
              {CLASSIFICACAO_LABEL[produtor.classificacao]}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-text-secondary">Contato</p>
            <p className="mt-1 text-sm text-text">{produtor.telefone || '—'}</p>
            <p className="text-sm text-text-secondary">{produtor.email || '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-text-secondary">Propriedades</p>
            <p className="mt-1 text-2xl font-semibold text-text">{produtor.propriedades.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-sm font-semibold text-text">Propriedades</h2>
          {podeEditar && (
            <Button size="sm" variant="outline" onClick={() => setNovaPropriedadeAberta(true)}>
              <Plus className="h-3.5 w-3.5" />
              Nova Propriedade
            </Button>
          )}
        </div>

        {produtor.propriedades.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={MapPin}
              title="Nenhuma propriedade cadastrada"
              description="Cadastre a fazenda para começar a emitir laudos para este produtor."
            />
          </div>
        ) : (
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {produtor.propriedades.map((propriedade) => (
              <div
                key={propriedade.id}
                className="rounded-xl border border-border p-4 transition-colors hover:border-accent/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-text">{propriedade.nome}</p>
                    <p className="text-xs text-text-secondary">
                      Matrícula {propriedade.matricula} · {propriedade.municipio}-{propriedade.uf}
                    </p>
                  </div>
                  {podeEditar && (
                    <button
                      type="button"
                      onClick={() => setPropriedadeEmEdicao(propriedade)}
                      className="shrink-0 rounded-md p-1 text-text-tertiary hover:bg-bg-subtle hover:text-accent"
                      aria-label={`Editar ${propriedade.nome}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-text-secondary">
                  Área total: {formatarNumero(propriedade.areaTotalHa)} ha
                </p>
                <Link
                  to={`/laudos/novo?produtorId=${produtor.id}&propriedadeId=${propriedade.id}`}
                  className={buttonVariants('outline', 'sm') + ' mt-3 w-full'}
                >
                  <Sprout className="h-3.5 w-3.5" />
                  Emitir laudo
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ProdutorFormDialog
        open={editarProdutor}
        onClose={() => setEditarProdutor(false)}
        produtor={produtor}
        onSaved={() => void carregar()}
      />

      <PropriedadeFormDialog
        open={novaPropriedadeAberta}
        onClose={() => setNovaPropriedadeAberta(false)}
        produtorId={produtor.id}
        onSaved={() => void carregar()}
      />

      <PropriedadeFormDialog
        open={!!propriedadeEmEdicao}
        onClose={() => setPropriedadeEmEdicao(null)}
        produtorId={produtor.id}
        propriedade={propriedadeEmEdicao}
        onSaved={() => void carregar()}
      />
    </div>
  );
}
