import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FieldError, Input, Label, Select } from '@/components/ui/Input';
import { ApiError } from '@/lib/api';
import { produtoresService } from '@/services/produtores';
import { toast } from '@/stores/toast';
import type { Produtor } from '@/types/domain';

const schema = z.object({
  nome: z.string().min(2, 'Informe o nome completo.'),
  cpfCnpj: z.string().min(11, 'CPF/CNPJ inválido.'),
  telefone: z.string().optional(),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
  municipio: z.string().min(1, 'Informe o município.'),
  uf: z.string().length(2, 'UF deve ter 2 letras.'),
  classificacao: z.enum(['PRONAF', 'PRONAMP', 'DEMAIS']),
});
type FormValues = z.infer<typeof schema>;

interface ProdutorFormDialogProps {
  open: boolean;
  onClose: () => void;
  produtor?: Produtor | null;
  onSaved: (produtor: Produtor) => void;
}

export function ProdutorFormDialog({ open, onClose, produtor, onSaved }: ProdutorFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { classificacao: 'DEMAIS' },
  });

  useEffect(() => {
    if (open) {
      reset(
        produtor
          ? {
              nome: produtor.nome,
              cpfCnpj: produtor.cpfCnpj,
              telefone: produtor.telefone ?? '',
              email: produtor.email ?? '',
              municipio: produtor.municipio,
              uf: produtor.uf,
              classificacao: produtor.classificacao,
            }
          : { nome: '', cpfCnpj: '', telefone: '', email: '', municipio: '', uf: '', classificacao: 'DEMAIS' },
      );
    }
  }, [open, produtor, reset]);

  async function onSubmit(data: FormValues) {
    try {
      const payload = { ...data, email: data.email || undefined, telefone: data.telefone || undefined };
      const salvo = produtor
        ? await produtoresService.atualizar(produtor.id, payload)
        : await produtoresService.criar(payload);
      toast.success(produtor ? 'Produtor atualizado.' : 'Produtor cadastrado.');
      onSaved(salvo);
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível salvar o produtor.');
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={produtor ? 'Editar produtor' : 'Novo produtor'}
      description="Cadastro único — nas próximas safras é só selecionar pelo nome ou CPF."
    >
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
        <div>
          <Label htmlFor="nome">Nome completo</Label>
          <Input id="nome" {...register('nome')} />
          <FieldError>{errors.nome?.message}</FieldError>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="cpfCnpj">CPF/CNPJ</Label>
            <Input id="cpfCnpj" {...register('cpfCnpj')} />
            <FieldError>{errors.cpfCnpj?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="classificacao">Classificação</Label>
            <Select id="classificacao" {...register('classificacao')}>
              <option value="DEMAIS">Demais</option>
              <option value="PRONAF">PRONAF</option>
              <option value="PRONAMP">PRONAMP</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" {...register('telefone')} />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" {...register('email')} />
            <FieldError>{errors.email?.message}</FieldError>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_80px] gap-3">
          <div>
            <Label htmlFor="municipio">Município</Label>
            <Input id="municipio" {...register('municipio')} />
            <FieldError>{errors.municipio?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="uf">UF</Label>
            <Input id="uf" maxLength={2} className="uppercase" {...register('uf')} />
            <FieldError>{errors.uf?.message}</FieldError>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Salvar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
