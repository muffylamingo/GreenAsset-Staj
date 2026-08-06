/** İstatistik ve dışa aktarma uçlarına yapılan çağrılar. */

import client from './client'

export async function getSummary(districtLimit = 8) {
  const { data } = await client.get('/stats/summary', {
    params: { district_limit: districtLimit },
  })
  return data
}

export async function getTimeseries(months = 12) {
  const { data } = await client.get('/stats/timeseries', { params: { months } })
  return data
}

/** Haritada çizilen poligona düşen varlıklar (ST_Within). */
export async function queryWithin(polygon, filtreler = {}) {
  const { data } = await client.post('/assets/within', {
    polygon,
    types: filtreler.types,
    statuses: filtreler.statuses,
  })
  return data
}

/**
 * Dışa aktarma bağlantısı üretir.
 *
 * Neden axios ile indirmiyoruz? Dosyayı JavaScript'e çekip Blob'a çevirmek
 * gereksiz bellek kullanır. Tarayıcının kendi indirme mekanizması daha iyi:
 * sadece doğru adresi üretip <a download> ile tıklatıyoruz.
 */
export function exportUrl(format, filtreler = {}) {
  const params = new URLSearchParams({ format })

  filtreler.types?.forEach((t) => params.append('type', t))
  filtreler.statuses?.forEach((s) => params.append('status', s))
  if (filtreler.districtId) params.set('district_id', filtreler.districtId)
  if (filtreler.q?.trim()) params.set('q', filtreler.q.trim())
  if (filtreler.bbox) params.set('bbox', filtreler.bbox.join(','))

  const taban = import.meta.env.VITE_API_URL || '/api/v1'
  return `${taban}/assets/export?${params}`
}
