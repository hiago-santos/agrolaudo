import { CheckCircle2, PenLine, Sprout, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { SignaturePad, type SignaturePadHandle } from '@/components/project/SignaturePad';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { PageSpinner } from '@/components/ui/Spinner';
import { ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { unitLabel } from '@/lib/units';
import { publicService, type PublicProject } from '@/services/public';
import { toast } from '@/stores/toast';

export function SignPublic() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [data, setData] = useState<PublicProject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signed, setSigned] = useState(false);
  const [sending, setSending] = useState(false);
  const padRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    if (!projectId || !token) {
      setError('Link de assinatura inválido — verifique se copiou o endereço completo.');
      setLoading(false);
      return;
    }
    publicService
      .getProject(projectId, token)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Não foi possível abrir este projeto.'))
      .finally(() => setLoading(false));
  }, [projectId, token]);

  async function confirm() {
    if (!projectId || !padRef.current || padRef.current.isEmpty()) {
      toast.error('Desenhe a assinatura antes de confirmar.');
      return;
    }
    setSending(true);
    try {
      await publicService.sign(projectId, token, padRef.current.toDataURL());
      setSigned(true);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível registrar a assinatura.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-1 pb-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
          <Sprout className="h-5 w-5" />
        </div>
        <h1 className="mt-2 text-lg font-semibold text-text">AgroLaudo</h1>
        <p className="text-sm text-text-secondary">Assinatura digital do Laudo de Capacidade Pagadora</p>
      </div>

      <div className="mx-auto max-w-2xl">
        {loading && <PageSpinner />}

        {!loading && error && (
          <Card className="flex flex-col items-center gap-2 p-8 text-center">
            <XCircle className="h-8 w-8 text-danger" />
            <p className="text-sm font-medium text-text">{error}</p>
          </Card>
        )}

        {!loading && data && !error && (signed || data.alreadySigned) && (
          <Card className="flex flex-col items-center gap-2 p-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <p className="text-sm font-medium text-text">Assinatura registrada com sucesso.</p>
            <p className="text-xs text-text-secondary">
              O projeto {data.project.number} foi atualizado. Pode fechar esta página.
            </p>
          </Card>
        )}

        {!loading && data && !error && !signed && !data.alreadySigned && (
          <div className="space-y-5">
            <Card className="overflow-hidden">
              <div className="border-b border-border bg-bg-subtle/50 px-5 py-2.5">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Confira os dados antes de assinar
                </h2>
              </div>
              <div className="space-y-1 p-5 text-sm">
                <p className="font-medium text-text">{data.project.number}</p>
                <p className="text-text-secondary">
                  {data.project.producer.name} · {data.project.property.name} · Safra {data.project.season.label}
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atividade</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Receita Líquida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.project.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.activityName}</TableCell>
                      <TableCell className="text-text-secondary">{unitLabel(item.unit)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.netProfit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm">
                <span className="text-text-secondary">Receita líquida total</span>
                <span className="font-semibold text-accent">{formatCurrency(data.project.totalProfit)}</span>
              </div>
            </Card>

            <Card className="space-y-3 p-5">
              <SignaturePad
                ref={padRef}
                label={`Assinatura — ${data.type === 'AGRONOMIST' ? 'Engenheiro Agrônomo' : 'Produtor Rural'}`}
              />
              <Button className="w-full" onClick={() => void confirm()} loading={sending}>
                <PenLine className="h-4 w-4" />
                Confirmar assinatura
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
