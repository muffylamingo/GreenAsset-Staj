/** İlçe uçlarına yapılan çağrılar. */

import client from './client'

/** Filtre açılır listesi için hafif liste (geometri içermez). */
export async function listDistricts() {
  const { data } = await client.get('/districts')
  return data
}

/**
 * Haritada sınır çizmek için geometriler.
 * tolerance: sadeleştirme miktarı (derece). Büyütürsen dosya küçülür,
 * sınırlar köşeli görünür. 0 = ham geometri (~1 MB).
 */
export async function getDistrictsGeoJSON(tolerance = 0.0005) {
  const { data } = await client.get('/districts/geojson', { params: { tolerance } })
  return data
}
