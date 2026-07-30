import { Check, MapPin, Plus, Search, UserCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ProdutorFormDialog } from '@/components/produtores/ProdutorFormDialog';
import { PropriedadeFormDialog } from '@/components/propriedades/PropriedadeFormDialog';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Label, Select } from '@/components/ui/Input';
import { agronomosService } from '@/services/agronomos';
import { produtoresService } from '@/services/produtores';
import { safrasService } from '@/services/safras';
import { useAuthStore } from '@/stores/auth';
import type { Agronomo, Produtor, Safra } from '@/types/domain';
import type { LaudoDraft } from '@/types/laudoDraft';
import { cn } from '@/lib/cn';

interface Step1Props {
  draft: LaudoDraft;
  onChange: (patch: Partial<LaudoDraft>) => void;
  onNext: () => void;
}

export function Step1SelecaoProdutor({ draft, onChange, onNext }: Step1Props) {
  const user = useAuthStore((s) => s.user);
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<Produtor[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [safras, setSafras] = useState<Safra[]>([]);
  const [agronomos, setAgronomos] = useState<Agronomo[]>([]);
  const [novoProdutorAberto, setNovoProdutorAberto] = useState(false);
  const [novaPropriedadeAberta, setNovaPropriedadeAberta] = useState(false);

  useEffect(() => {
    void safrasService.listar().then((lista) => {
      setSafras(lista);
      const ativa = lista.find((s) => s.ativa);
      if (ativa && !draft.safra) onChange({ safra: ativa });
    });
    if (user?.role === 'ADMIN') {
      void agronomosService.listar().then(setAgronomos);
    } else if (user?.agronomo) {
      onChange({ agronomoId: user.agronomo.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!busca.trim()) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    const timeout = setTimeout(() => {
      produtoresService
        .listar({ busca, pageSize: 8 })
        .then((r) => setResultados(r.items))
        .finally(() => setBuscando(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [busca]);

  function selecionarProdutor(produtor: Produtor) {
    onChange({
      produtor,
      propriedade: produtor.propriedades.length === 1 ? produtor.propriedades[0] : null,
    });
    setBusca('');
    setResultados([]);
  }

  const podeAvancar = !!draft.produtor && !!draft.propriedade && !!draft.safra && !!draft.agronomoId;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <Label>Produtor</Label>
        {draft.produtor ? (
          <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent-soft px-4 py-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-accent" />
              <div>
                <p className="text-sm font-medium text-text">{draft.produtor.nome}</p>
                <p className="text-xs text-text-secondary">{draft.produtor.cpfCnpj}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onChange({ produtor: null, propriedade: null })}>
              Trocar
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou CPF/CNPJ..."
                className="pl-9"
              />
            </div>
            {busca && (
              <div className="rounded-lg border border-border">
                {buscando && <p className="p-3 text-xs text-text-secondary">Buscando...</p>}
                {!buscando && resultados.length === 0 && (
                  <p className="p-3 text-xs text-text-secondary">Nenhum produtor encontrado.</p>
                )}
                {resultados.map((produtor) => (
                  <button
                    key={produtor.id}
                    type="button"
                    onClick={() => selecionarProdutor(produtor)}
                    className="flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-bg-subtle"
                  >
                    <span className="font-medium text-text">{produtor.nome}</span>
                    <span className="text-xs text-text-secondary">{produtor.cpfCnpj}</span>
                  </button>
                ))}
              </div>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => setNovoProdutorAberto(true)}>
              <Plus className="h-3.5 w-3.5" />
              Criar novo produtor
            </Button>
          </div>
        )}
      </Card>

      {draft.produtor && (
        <Card className="p-5">
          <Label>Propriedade</Label>
          <div className="space-y-2">
            {draft.produtor.propriedades.map((propriedade) => (
              <button
                key={propriedade.id}
                type="button"
                onClick={() => onChange({ propriedade })}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors',
                  draft.propriedade?.id === propriedade.id
                    ? 'border-accent/30 bg-accent-soft'
                    : 'border-border hover:bg-bg-subtle',
                )}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-text-tertiary" />
                  <div>
                    <p className="text-sm font-medium text-text">{propriedade.nome}</p>
                    <p className="text-xs text-text-secondary">
                      Matrícula {propriedade.matricula} · {propriedade.municipio}-{propriedade.uf}
                    </p>
                  </div>
                </div>
                {draft.propriedade?.id === propriedade.id && <Check className="h-4 w-4 text-accent" />}
              </button>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setNovaPropriedadeAberta(true)}>
              <Plus className="h-3.5 w-3.5" />
              Nova propriedade
            </Button>
          </div>
        </Card>
      )}

      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="safra">Safra de referência</Label>
          <Select
            id="safra"
            value={draft.safra?.id ?? ''}
            onChange={(e) => onChange({ safra: safras.find((s) => s.id === e.target.value) ?? null })}
          >
            <option value="" disabled>
              Selecione a safra
            </option>
            {safras.map((safra) => (
              <option key={safra.id} value={safra.id}>
                {safra.rotulo}
              </option>
            ))}
          </Select>
        </div>

        {user?.role === 'ADMIN' && (
          <div>
            <Label htmlFor="agronomo">Engenheiro Agrônomo responsável</Label>
            <Select
              id="agronomo"
              value={draft.agronomoId ?? ''}
              onChange={(e) => onChange({ agronomoId: e.target.value || null })}
            >
              <option value="" disabled>
                Selecione o agrônomo
              </option>
              {agronomos.map((agronomo) => (
                <option key={agronomo.id} value={agronomo.id}>
                  {agronomo.nome} — {agronomo.crea}
                </option>
              ))}
            </Select>
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!podeAvancar}>
          Próximo: Atividades
        </Button>
      </div>

      <ProdutorFormDialog
        open={novoProdutorAberto}
        onClose={() => setNovoProdutorAberto(false)}
        onSaved={(produtor) => selecionarProdutor(produtor)}
      />
      {draft.produtor &&
        (() => {
          const produtor = draft.produtor;
          return (
            <PropriedadeFormDialog
              open={novaPropriedadeAberta}
              onClose={() => setNovaPropriedadeAberta(false)}
              produtorId={produtor.id}
              onSaved={(propriedade) =>
                onChange({
                  produtor: { ...produtor, propriedades: [...produtor.propriedades, propriedade] },
                  propriedade,
                })
              }
            />
          );
        })()}
    </div>
  );
}
