import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FieldError, Input, Label, Select } from '@/components/ui/Input';
import { ApiError } from '@/lib/api';
import { producersService } from '@/services/producers';
import { toast } from '@/stores/toast';
import type { Producer } from '@/types/domain';

const schema = z.object({
  name: z.string().min(2, 'Informe o nome completo.'),
  taxId: z.string().min(11, 'CPF/CNPJ inválido.'),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
  city: z.string().min(1, 'Informe o município.'),
  state: z.string().length(2, 'UF deve ter 2 letras.'),
  classification: z.enum(['PRONAF', 'PRONAMP', 'OTHER']),
});
type FormValues = z.infer<typeof schema>;

interface ProducerFormDialogProps {
  open: boolean;
  onClose: () => void;
  producer?: Producer | null;
  onSaved: (producer: Producer) => void;
}

export function ProducerFormDialog({ open, onClose, producer, onSaved }: ProducerFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { classification: 'OTHER' },
  });

  useEffect(() => {
    if (open) {
      reset(
        producer
          ? {
              name: producer.name,
              taxId: producer.taxId,
              phone: producer.phone ?? '',
              email: producer.email ?? '',
              city: producer.city,
              state: producer.state,
              classification: producer.classification,
            }
          : { name: '', taxId: '', phone: '', email: '', city: '', state: '', classification: 'OTHER' },
      );
    }
  }, [open, producer, reset]);

  async function onSubmit(data: FormValues) {
    try {
      const payload = { ...data, email: data.email || undefined, phone: data.phone || undefined };
      const saved = producer
        ? await producersService.update(producer.id, payload)
        : await producersService.create(payload);
      toast.success(producer ? 'Produtor atualizado.' : 'Produtor cadastrado.');
      onSaved(saved);
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível salvar o produtor.');
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={producer ? 'Editar produtor' : 'Novo produtor'}
      description="Cadastro único — nas próximas safras é só selecionar pelo nome ou CPF."
    >
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
        <div>
          <Label htmlFor="name">Nome completo</Label>
          <Input id="name" {...register('name')} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="taxId">CPF/CNPJ</Label>
            <Input id="taxId" {...register('taxId')} />
            <FieldError>{errors.taxId?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="classification">Classificação</Label>
            <Select id="classification" {...register('classification')}>
              <option value="OTHER">Demais</option>
              <option value="PRONAF">PRONAF</option>
              <option value="PRONAMP">PRONAMP</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" {...register('phone')} />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" {...register('email')} />
            <FieldError>{errors.email?.message}</FieldError>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_80px] gap-3">
          <div>
            <Label htmlFor="city">Município</Label>
            <Input id="city" {...register('city')} />
            <FieldError>{errors.city?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="state">UF</Label>
            <Input id="state" maxLength={2} className="uppercase" {...register('state')} />
            <FieldError>{errors.state?.message}</FieldError>
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
