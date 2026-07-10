import Link from 'next/link';
import { Stethoscope, ArrowRight } from 'lucide-react';

/**
 * A consultation is always opened for a specific encounter (from the queue's
 * "Call" action). This landing page explains that entry point rather than
 * showing an empty workspace with no patient.
 */
export default function ConsultationIndexPage() {
  return (
    <div className="p-7 max-w-[600px] mx-auto w-full">
      <div className="rounded-xl border p-8 text-center" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="w-12 h-12 rounded-xl grid place-items-center mx-auto mb-4" style={{ background: '#7c3aed1a' }}>
          <Stethoscope size={22} style={{ color: '#7c3aed' }} />
        </div>
        <h1 className="text-[17px] font-semibold">Consultations start from the queue</h1>
        <p className="text-[13px] mt-2 mb-5" style={{ color: 'var(--sub)' }}>
          Call a patient from the live queue to open their consultation workspace —
          history, vitals, and labs load automatically, ready for the SOAP note.
        </p>
        <Link href="/queue" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-medium text-white" style={{ background: 'var(--accent)' }}>
          Go to queue <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
