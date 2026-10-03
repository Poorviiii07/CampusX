import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Room } from '@/types';
import { reservationsApi, timetableApi } from '@/api/endpoints';
import { useToast } from '@/components/ui/useToast';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';

const schema = z
  .object({
    date: z.string().min(1, 'Date required'),
    periodStart: z.coerce.number().min(1).max(8),
    periodEnd: z.coerce.number().min(1).max(8),
    reason: z.string().min(1, 'Reason required'),
    classId: z.string().optional(),
    type: z.enum(['SINGLE', 'MULTI_PERIOD', 'FULL_DAY']),
  })
  .refine((d) => d.periodEnd >= d.periodStart, {
    message: 'Period End must be ≥ Period Start',
    path: ['periodEnd'],
  });

type FormValues = z.infer<typeof schema>;

const periodOptions = Array.from({ length: 8 }, (_, i) => ({
  label: `Period ${i + 1}`,
  value: i + 1,
}));

const typeOptions = [
  { label: 'Single Period', value: 'SINGLE' },
  { label: 'Multi Period', value: 'MULTI_PERIOD' },
  { label: 'Full Day', value: 'FULL_DAY' },
];

interface ReservationModalProps {
  open: boolean;
  room: Room;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReservationModal({ open, room, onClose, onSuccess }: ReservationModalProps) {
  const { push } = useToast();

  const { data: classes = [] } = useQuery({
    queryKey: ['timetable-classes'],
    queryFn: () => timetableApi.getClasses(),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      periodStart: 1,
      periodEnd: 1,
      type: 'SINGLE',
    },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      reservationsApi.create({
        roomId: room.id,
        date: values.date,
        periodStart: values.periodStart,
        periodEnd: values.periodEnd,
        reason: values.reason,
        classId: values.classId || undefined,
        type: values.type,
      }),
    onSuccess: () => {
      push('Room reserved successfully', 'success');
      onSuccess();
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setError('root', { message: 'Conflict: this room is already reserved for that time.' });
      } else {
        push('Failed to create reservation', 'error');
      }
    },
  });

  const classOptions = classes.map((c) => ({ label: c.name, value: c.id }));

  return (
    <Modal open={open} onClose={onClose} title={`Reserve ${room.code}`} size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" loading={mutation.isPending} onClick={handleSubmit((v) => mutation.mutate(v))}>
            Confirm Reservation
          </Button>
        </>
      }
    >
      <form className="space-y-3" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        {errors.root && (
          <p className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">{errors.root.message}</p>
        )}

        <Input
          label="Date"
          type="date"
          register={register('date')}
          error={errors.date?.message}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Period Start"
            register={register('periodStart')}
            options={periodOptions}
            error={errors.periodStart?.message}
          />
          <Select
            label="Period End"
            register={register('periodEnd')}
            options={periodOptions}
            error={errors.periodEnd?.message}
          />
        </div>

        <Select
          label="Type"
          register={register('type')}
          options={typeOptions}
          error={errors.type?.message}
        />

        <Textarea
          label="Reason"
          register={register('reason')}
          rows={2}
          placeholder="Purpose of reservation"
          error={errors.reason?.message}
        />

        {classOptions.length > 0 && (
          <Select
            label="Class (optional)"
            register={register('classId')}
            options={classOptions}
            placeholder="— none —"
            error={errors.classId?.message}
          />
        )}
      </form>
    </Modal>
  );
}

export default ReservationModal;
