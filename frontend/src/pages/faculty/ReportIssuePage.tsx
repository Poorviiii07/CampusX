import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { ComplaintCategory, ComplaintPriority } from '@/types';
import { complaintsApi, buildingsApi } from '@/api/endpoints';
import { useToast } from '@/components/ui/useToast';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import FileInput from '@/components/ui/FileInput';

const CATEGORIES: ComplaintCategory[] = [
  'EQUIPMENT', 'PROJECTOR', 'COMPUTER', 'AC', 'FAN_LIGHT', 'WATER', 'RESTROOM', 'NETWORK', 'CLASSROOM_DAMAGE', 'ELECTRICAL', 'OTHER',
];

const PRIORITIES: ComplaintPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

const schema = z.object({
  buildingId: z.string().min(1, 'Building required'),
  floorId: z.string().optional(),
  roomId: z.string().optional(),
  category: z.enum(['EQUIPMENT', 'PROJECTOR', 'COMPUTER', 'AC', 'FAN_LIGHT', 'WATER', 'RESTROOM', 'NETWORK', 'CLASSROOM_DAMAGE', 'ELECTRICAL', 'OTHER']),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
});

type FormValues = z.infer<typeof schema>;

export default function ReportIssuePage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [image, setImage] = useState<File | null>(null);

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => buildingsApi.list({ isActive: true }),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'MEDIUM', category: 'OTHER' },
  });

  const selectedBuildingId = watch('buildingId');

  const { data: floors = [] } = useQuery({
    queryKey: ['floors', selectedBuildingId],
    queryFn: () => buildingsApi.listFloors(selectedBuildingId),
    enabled: !!selectedBuildingId,
  });

  const selectedFloorId = watch('floorId');

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      let imageUrl: string | undefined;
      if (image) {
        // In a real implementation the image would be uploaded first; for now pass the file name
        imageUrl = image.name;
      }
      return complaintsApi.file({
        category: values.category,
        buildingId: values.buildingId || undefined,
        floorId: values.floorId || undefined,
        roomId: values.roomId || undefined,
        description: values.description,
        priority: values.priority,
        imageUrl,
      });
    },
    onSuccess: (res) => {
      push(`Complaint filed! ID: ${res.autoId}`, 'success');
      navigate('/complaints');
    },
    onError: () => push('Failed to file complaint', 'error'),
  });

  const buildingOptions = buildings.map((b) => ({ label: b.name, value: b.id }));
  const floorOptions = floors.map((f) => ({ label: `Floor ${f.floorNumber} — ${f.name}`, value: f.id }));
  const categoryOptions = CATEGORIES.map((c) => ({ label: c.replace('_', ' '), value: c }));
  const priorityOptions = PRIORITIES.map((p) => ({ label: p, value: p }));

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">Report an Issue</h1>

      <Card>
        <CardHeader>
          <p className="text-sm text-gray-600">Describe the issue and we'll route it to the right team.</p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
            <Select
              label="Building"
              register={register('buildingId')}
              options={buildingOptions}
              placeholder="Select building"
              error={errors.buildingId?.message}
            />

            {floors.length > 0 && (
              <Select
                label="Floor (optional)"
                register={register('floorId')}
                options={floorOptions}
                placeholder="Select floor"
              />
            )}

            {selectedFloorId && (
              <Select
                label="Room (optional)"
                register={register('roomId')}
                options={[]}
                placeholder="Enter room code"
              />
            )}

            <Select
              label="Category"
              register={register('category')}
              options={categoryOptions}
              error={errors.category?.message}
            />

            <Textarea
              label="Description"
              register={register('description')}
              rows={3}
              placeholder="Describe the issue in detail (min. 20 characters)"
              error={errors.description?.message}
            />

            <Select
              label="Priority"
              register={register('priority')}
              options={priorityOptions}
              error={errors.priority?.message}
            />

            <FileInput
              label="Image (optional, max 5 MB)"
              accept="image/*"
              onChange={(f) => {
                if (f && f.size > 5 * 1024 * 1024) {
                  setImage(null);
                } else {
                  setImage(f);
                }
              }}
            />

            <Button type="submit" loading={mutation.isPending}>Submit Complaint</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
