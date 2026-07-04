import { useEffect, useRef } from 'react';
import { api } from '../lib/api';

const POLL_MS = 4000;

export function useCopyJobRunner({ accountId, connected, getProposal, buyContract }) {
  const busyRef = useRef(false);

  useEffect(() => {
    if (!accountId || !connected) return;

    const run = async () => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const { jobs } = await api.getPendingCopyJobs();
        for (const job of jobs || []) {
          try {
            const t = job.trade;
            const proposal = await getProposal({
              contractType: t.contractType,
              amount: t.amount,
              duration: t.duration,
              durationUnit: t.durationUnit,
              symbol: t.symbol,
              currency: t.currency,
              barrier: t.barrier,
              growthRate: t.growthRate,
            });
            const proposalId = proposal.proposal?.id;
            const price = proposal.proposal?.ask_price;
            if (!proposalId || price == null) throw new Error('No proposal');
            const result = await buyContract(String(proposalId), price);
            await api.completeCopyJob(job.id, { contractId: result.buy?.contract_id });
          } catch (err) {
            await api.completeCopyJob(job.id, { error: err.message }).catch(() => {});
          }
        }
      } catch {
        /* ignore poll errors */
      } finally {
        busyRef.current = false;
      }
    };

    run();
    const timer = setInterval(run, POLL_MS);
    return () => clearInterval(timer);
  }, [accountId, connected, getProposal, buyContract]);
}
