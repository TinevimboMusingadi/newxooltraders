import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.getAccounts(),
    staleTime: 30_000,
  });
}

export function useSymbols() {
  return useQuery({
    queryKey: ['symbols'],
    queryFn: () => api.getLiveSymbols(),
    staleTime: 5 * 60_000,
  });
}

export function useMarketCategories() {
  return useQuery({
    queryKey: ['marketCategories'],
    queryFn: () => api.getMarketCategories(),
    staleTime: 5 * 60_000,
  });
}

export function useLiveSignals() {
  return useQuery({
    queryKey: ['liveSignals'],
    queryFn: () => api.getLiveSignals(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useProfitTable({ from, to, limit = 50, offset = 0 } = {}) {
  return useQuery({
    queryKey: ['profitTable', { from, to, limit, offset }],
    queryFn: () => api.getProfitTable({ from, to, limit, offset }),
    staleTime: 30_000,
    enabled: true,
    retry: 1,
  });
}

export function useStatement({ from, to, actionType, limit = 50 } = {}) {
  return useQuery({
    queryKey: ['statement', { from, to, actionType, limit }],
    queryFn: () => api.getStatement({ from, to, actionType, limit }),
    staleTime: 30_000,
    enabled: true,
    retry: 1,
  });
}

export function useLocalTrades({ limit = 100 } = {}) {
  return useQuery({
    queryKey: ['localTrades', { limit }],
    queryFn: () => api.getLocalTrades({ limit }),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function useBotConfigs() {
  return useQuery({
    queryKey: ['botConfigs'],
    queryFn: () => api.getBotConfigs(),
    staleTime: 10_000,
  });
}

export function useCopyProvider() {
  return useQuery({
    queryKey: ['copyProvider'],
    queryFn: () => api.getCopyProvider(),
    staleTime: 30_000,
  });
}

export function useCopySubscriptions() {
  return useQuery({
    queryKey: ['copySubscriptions'],
    queryFn: () => api.getCopySubscriptions(),
    staleTime: 10_000,
  });
}

export function useCopyJobs() {
  return useQuery({
    queryKey: ['copyJobs'],
    queryFn: () => api.getCopyJobs(),
    staleTime: 5_000,
    refetchInterval: 8_000,
  });
}

export function useSaveBotConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config) => api.saveBotConfig(config),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['botConfigs'] }),
  });
}

export function useDeleteBotConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.deleteBotConfig(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['botConfigs'] }),
  });
}

export function useEnableCopyProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.enableCopyProvider(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['copyProvider'] }),
  });
}

export function useSubscribeCopy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ providerCode, riskPct }) => api.subscribeCopy(providerCode, riskPct),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['copySubscriptions'] }),
  });
}

export function useUnsubscribeCopy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.unsubscribeCopy(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['copySubscriptions'] }),
  });
}

export function useSelectAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId) => api.selectAccount(accountId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useCreateDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.createDemoAccount(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useResetDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId) => api.resetDemoBalance(accountId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}
