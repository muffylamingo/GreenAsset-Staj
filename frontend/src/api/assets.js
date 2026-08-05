/**
 * Varlık uçlarına yapılan çağrılar.
 *
 * Bu dosya backend'in API sözleşmesini bilen TEK yer.
 * Bileşenler URL veya sorgu parametresi bilmez, sadece bu fonksiyonları çağırır.
 */

import client from './client'

/**
 * Filtre nesnesini backend'in beklediği sorgu parametrelerine çevirir.
 *
 * Boş/undefined değerler atlanır — aksi halde "?type=" gibi anlamsız
 * parametreler gider ve backend 422 döndürür.
 */
function sorguParametreleri(filtreler = {}) {
  const params = new URLSearchParams()

  // Çoklu seçim: aynı anahtar birden çok kez eklenir (?type=TREE&type=BENCH)
  filtreler.types?.forEach((t) => params.append('type', t))
  filtreler.statuses?.forEach((s) => params.append('status', s))

  if (filtreler.districtId) params.set('district_id', filtreler.districtId)
  if (filtreler.q?.trim()) params.set('q', filtreler.q.trim())
  if (filtreler.bbox) params.set('bbox', filtreler.bbox.join(','))
  if (filtreler.limit != null) params.set('limit', filtreler.limit)
  if (filtreler.offset != null) params.set('offset', filtreler.offset)
  if (filtreler.sortBy) params.set('sort_by', filtreler.sortBy)
  if (filtreler.sortDir) params.set('sort_dir', filtreler.sortDir)

  return params
}

/**
 * Tablo için düz liste. Toplam sayı gövdede değil BAŞLIKTA gelir
 * (X-Total-Count), o yüzden ikisini birlikte döndürüyoruz.
 */
export async function listAssets(filtreler) {
  const params = sorguParametreleri(filtreler)
  params.set('format', 'json')

  const { data, headers } = await client.get('/assets', { params })
  return {
    items: data,
    total: Number(headers['x-total-count'] ?? data.length),
  }
}

/** Harita için GeoJSON FeatureCollection. */
export async function listAssetsGeoJSON(filtreler) {
  const params = sorguParametreleri(filtreler)
  params.set('format', 'geojson')

  const { data } = await client.get('/assets', { params })
  return data
}

export async function getAsset(id) {
  const { data } = await client.get(`/assets/${id}`)
  return data
}

export async function createAsset(payload) {
  const { data } = await client.post('/assets', payload)
  return data
}

export async function updateAsset(id, payload) {
  const { data } = await client.put(`/assets/${id}`, payload)
  return data
}

export async function deleteAsset(id) {
  await client.delete(`/assets/${id}`)
}

export async function bulkUpdateStatus(ids, status) {
  const { data } = await client.patch('/assets/bulk/status', { ids, status })
  return data
}

export async function bulkDeleteAssets(ids) {
  const { data } = await client.post('/assets/bulk/delete', { ids })
  return data
}
