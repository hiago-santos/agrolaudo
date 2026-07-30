import { CheckCircle2, ShieldCheck, Sprout, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Card } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatarData, formatarDataHora } from '@/lib/format';
import { publicoService, type VerificacaoPublica } from '@/services/publico';

export function VerificarPublico() {
  const { hash } = useParams<{ hash: string }>();
  const [dados, setDados] = useState<VerificacaoPublica | null>(null);
  const [erro, setErro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hash) {
      setErro(true);
      setLoading(false);
      return;
    }
    publicoService
      .verificar(hash)
      .then(setDados)
      .catch(() => setErro(true))
      .finally(() => setLoading(false));
  }, [hash]);

  return (
    <div className="flex min-h-screen flex-col items-center bg-bg px-4 py-10">
      <div className="mb-6 flex flex-col items-center gap-1 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
          <Sprout className="h-5 w-5" />
        </div>
        <h1 className="mt-2 text-lg font-semibold text-text">AgroLaudo</h1>
        <p className="text-sm text-text-secondary">Verificação de autenticidade de documento</p>
      </div>

      <div className="w-full max-w-md">
        {loading && <PageSpinner />}

        {!loading && (erro || !dados) && (
          <Card className="flex flex-col items-center gap-3 p-8 text-center">
            <XCircle className="h-9 w-9 text-danger" />
            <div>
              <p className="text-sm font-semibold text-text">Documento não encontrado</p>
              <p className="mt-1 text-xs text-text-secondary">
                Este código não corresponde a nenhum laudo assinado no AgroLaudo.
              </p>
            </div>
          </Card>
        )}

        {!loading && dados && (
          <Card className="space-y-5 p-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <CheckCircle2 className="h-9 w-9 text-success" />
              <div>
                <p className="text-sm font-semibold text-text">Documento autêntico</p>
                <p className="text-xs text-text-secondary">Laudo {dados.numero}</p>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
              <Linha rotulo="Produtor" valor={dados.produtor} />
              <Linha rotulo="Propriedade" valor={dados.propriedade} />
              <Linha rotulo="Safra" valor={dados.safra} />
              <Linha rotulo="Agrônomo" valor={`${dados.agronomo.nome} · ${dados.agronomo.crea}`} />
              <Linha rotulo="Emitido em" valor={formatarData(dados.dataEmissao)} />
            </div>

            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                <ShieldCheck className="h-3.5 w-3.5" />
                Assinaturas
              </p>
              {dados.assinaturas.map((a) => (
                <div key={a.tipo} className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">{a.nomeSignatario}</span>
                  <span className="text-text">{a.assinadoEm ? formatarDataHora(a.assinadoEm) : 'pendente'}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-text-secondary">{rotulo}</span>
      <span className="text-right font-medium text-text">{valor}</span>
    </div>
  );
}
