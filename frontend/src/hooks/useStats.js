import { useMutation, useQuery } from '@tanstack/react-query'

import { getSummary, getTimeseries, queryNearby, queryWithin } from '../api/stats'

/** Dashboard özeti — KPI'lar ve dağılımlar. */
export function useSummary(districtLimit = 8) {
  return useQuery({
    queryKey: ['stats', 'summary', districtLimit],
    queryFn: () => getSummary(districtLimit),
  })
}

/** Zaman serisi — aylık ekleme grafiği. */
export function useTimeseries(months = 12) {
  return useQuery({
    queryKey: ['stats', 'timeseries', months],
    queryFn: () => getTimeseries(months),
    placeholderData: (onceki) => onceki, // aralık değişince grafik boşalmasın
  })
}

/**
 * Poligon sorgusu — kullanıcı haritada alan çizince tetiklenir.
 * useQuery değil useMutation, çünkü otomatik değil kullanıcı eylemiyle çalışır.
 */
export function useWithinQuery() {
  return useMutation({
    mutationFn: ({ polygon, filtreler }) => queryWithin(polygon, filtreler),
  })
}

/** Yakındaki varlıklar — kullanıcı "yakınımdakiler"e basınca çalışır. */
export function useNearbyQuery() {
  return useMutation({ mutationFn: queryNearby })
}
