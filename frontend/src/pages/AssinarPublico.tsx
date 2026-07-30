import { CheckCircle2, PenLine, Sprout, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { SignaturePad, type SignaturePadHandle } from '@/components/laudo/SignaturePad';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { ApiError } from '@/lib/api';
import { publicoService, type LaudoPublico } from '@/services/publico';
import { toast } from '@/stores/toast';

export function AssinarPublico() {
  const { laudoId } = useParams<{ laudoId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [dados, setDados] = useState<LaudoPublico | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [assinado, setAssinado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const padRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    if (!laudoId || !token) {
      setErro('Link de assinatura inválido — verifique se copiou o endereço completo.');
      setLoading(false);
      return;
    }
    publicoService
      .obterLaudo(laudoId, token)
      .then(setDados)
      .catch((e: unknown) => setErro(e instanceof ApiError ? e.message : 'Não foi possível abrir este laudo.'))
      .finally(() => setLoading(false));
  }, [laudoId, token]);

  async function confirmar() {
    if (!laudoId || !padRef.current || padRef.current.isEmpty()) {
      toast.error('Desenhe a assinatura antes de confirmar.');
      return;
    }
    setEnviando(true);
    try {
      await publicoService.assinar(laudoId, token, padRef.current.toDataURL());
      setAssinado(true);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível registrar a assinatura.');
    } finally {
      setEnviando(false);
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

        {!loading && erro && (
          <Card className="flex flex-col items-center gap-2 p-8 text-center">
            <XCircle className="h-8 w-8 text-danger" />
            <p className="text-sm font-medium text-text">{erro}</p>
          </Card>
        )}

        {!loading && dados && !erro && (assinado || dados.jaAssinado) && (
          <Card className="flex flex-col items-center gap-2 p-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <p className="text-sm font-medium text-text">Assinatura registrada com sucesso.</p>
            <p className="text-xs text-text-secondary">
              O laudo {dados.numero} foi atualizado. Pode fechar esta página.
            </p>
          </Card>
        )}

        {!loading && dados && !erro && !assinado && !dados.jaAssinado && (
          <div className="space-y-5">
            <Card className="overflow-hidden">
              <div className="border-b border-border bg-bg-subtle/50 px-5 py-2.5">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Confira os dados antes de assinar
                </h2>
              </div>
              <iframe title={`Laudo ${dados.numero}`} srcDoc={dados.html} className="h-[520px] w-full" />
            </Card>

            <Card className="space-y-3 p-5">
              <SignaturePad ref={padRef} label={`Assinatura — ${dados.tipo === 'AGRONOMO' ? 'Engenheiro Agrônomo' : 'Produtor Rural'}`} />
              <Button className="w-full" onClick={() => void confirmar()} loading={enviando}>
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
