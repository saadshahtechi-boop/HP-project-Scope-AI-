'use client';

import { use } from 'react';
import { Consultation } from '../../../features/consultation/components/consultation';

export default function ConsultationPage({ params }: { params: Promise<{ encounterId: string }> }) {
  const { encounterId } = use(params);
  return <Consultation encounterId={encounterId} />;
}
