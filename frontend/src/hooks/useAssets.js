/**
 * Varlık verisi için React Query hook'ları.
 *
 * React Query bize bedava veriyor:
 *   - yükleniyor / hata / veri durumları
 *   - önbellek (aynı sorgu iki kez atılmaz)
 *   - mutation sonrası otomatik yenileme (invalidateQueries)
 *
 * Elle useState + useEffect + fetch yazsaydık bunların hepsini kendimiz
 * yönetmek zorunda kalırdık.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as api from '../api/assets'
import { listDistricts } from '../api/districts'

/**
 * Önbellek anahtarları.
 * Bir anahtarı invalidate edince o anahtarla başlayan TÜM sorgular yenilenir.
 * Bu yüzden hiyerarşik tutuyoruz: ['assets'] → ['assets','list',filtreler]
 */
export const anahtarlar = {
  tumVarliklar: ['assets'],
  liste: (filtreler) => ['assets', 'list', filtreler],
  geojson: (filtreler) => ['assets', 'geojson', filtreler],
  tekil: (id) => ['assets', 'detail', id],
  ilceler: ['districts'],
}

/** Tablo için sayfalanmış liste. */
export function useAssets(filtreler) {
  return useQuery({
    queryKey: anahtarlar.liste(filtreler),
    queryFn: () => api.listAssets(filtreler),
    // Sayfa değişince eski veriyi ekranda tut, "boşalıp dolma" titremesi olmasın
    placeholderData: (oncekiVeri) => oncekiVeri,
  })
}

/** Harita için GeoJSON. */
export function useAssetsGeoJSON(filtreler, etkin = true) {
  return useQuery({
    queryKey: anahtarlar.geojson(filtreler),
    queryFn: () => api.listAssetsGeoJSON(filtreler),
    enabled: etkin,
  })
}

/** İlçe listesi — nadiren değişir, uzun süre önbellekte kalabilir. */
export function useDistricts() {
  return useQuery({
    queryKey: anahtarlar.ilceler,
    queryFn: listDistricts,
    staleTime: 30 * 60 * 1000, // 30 dakika
  })
}

/**
 * Yazma işlemleri sonrası önbelleği tazeleyen ortak yardımcı.
 * Varlık eklendiğinde ilçe sayıları da değiştiği için ikisini birden yeniliyoruz.
 */
function useTazele() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: anahtarlar.tumVarliklar })
    queryClient.invalidateQueries({ queryKey: anahtarlar.ilceler })
  }
}

export function useCreateAsset() {
  const tazele = useTazele()
  return useMutation({ mutationFn: api.createAsset, onSuccess: tazele })
}

export function useUpdateAsset() {
  const tazele = useTazele()
  return useMutation({
    mutationFn: ({ id, payload }) => api.updateAsset(id, payload),
    onSuccess: tazele,
  })
}

export function useDeleteAsset() {
  const tazele = useTazele()
  return useMutation({ mutationFn: api.deleteAsset, onSuccess: tazele })
}

export function useBulkUpdateStatus() {
  const tazele = useTazele()
  return useMutation({
    mutationFn: ({ ids, status }) => api.bulkUpdateStatus(ids, status),
    onSuccess: tazele,
  })
}

export function useBulkDelete() {
  const tazele = useTazele()
  return useMutation({ mutationFn: api.bulkDeleteAssets, onSuccess: tazele })
}
