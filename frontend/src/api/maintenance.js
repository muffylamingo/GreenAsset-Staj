/** Bakım geçmişi uçlarına yapılan çağrılar. */

import client from './client'

export async function listLogs(assetId) {
  const { data } = await client.get(`/assets/${assetId}/logs`)
  return data
}

export async function createLog(assetId, payload) {
  const { data } = await client.post(`/assets/${assetId}/logs`, payload)
  return data
}

export async function deleteLog(logId) {
  await client.delete(`/maintenance/${logId}`)
}
