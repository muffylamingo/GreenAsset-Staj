import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as api from '../api/maintenance'
import { anahtarlar } from './useAssets'

/** Bir varlığın bakım geçmişi. */
export function useMaintenanceLogs(assetId) {
  return useQuery({
    queryKey: ['maintenance', assetId],
    queryFn: () => api.listLogs(assetId),
    enabled: Boolean(assetId), // yeni varlık ekleme modunda sorgu atma
  })
}

/**
 * Bakım kaydı ekleme.
 *
 * Başarıdan sonra İKİ önbellek tazeleniyor:
 *   - bakım listesi (yeni kayıt görünsün)
 *   - varlıklar (durum değişmiş olabilir + "kaç gündür bakılmadı" güncellensin)
 */
export function useCreateLog(assetId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.createLog(assetId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', assetId] })
      queryClient.invalidateQueries({ queryKey: anahtarlar.tumVarliklar })
    },
  })
}

export function useDeleteLog(assetId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', assetId] })
      queryClient.invalidateQueries({ queryKey: anahtarlar.tumVarliklar })
    },
  })
}
