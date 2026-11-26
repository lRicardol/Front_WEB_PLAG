import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSocialCollaboration } from './useSocialCollaboration'
import { SHARED_ACTIVITY_ACTIONS } from '../api/socialContracts'

const svc = vi.hoisted(() => ({
  getConnections: vi.fn(),
  getTripActivities: vi.fn(),
  shareActivity: vi.fn(),
  updateSharedActivity: vi.fn(),
  getSharedActivities: vi.fn(),
  getCompatibilityMatches: vi.fn(),
}))

vi.mock('../services/socialCollaborationService', () => ({
  socialCollaborationService: svc,
}))

beforeEach(() => {
  vi.clearAllMocks()
  svc.getConnections.mockResolvedValue([{ id: 1, username: 'a', status: '' }])
  svc.getTripActivities.mockResolvedValue([{ id: 1, name: 'x' }])
  svc.shareActivity.mockResolvedValue({ id: 10, activityId: 1, senderId: 1, receiverId: 2, status: 'PENDING', sharedPlan: false })
  svc.updateSharedActivity.mockResolvedValue({ id: 10, activityId: 1, senderId: 1, receiverId: 2, status: 'ACCEPTED', sharedPlan: true })
  svc.getSharedActivities.mockResolvedValue([])
  svc.getCompatibilityMatches.mockResolvedValue([
    { userId: 1, totalScore: 1, destinationScore: 0, dateProximityScore: 0, interestScore: 0, matchedInterests: ['beach'] },
  ])
})

describe('useSocialCollaboration', () => {
  it('load share resolve matches toggle', async () => {
    const { result } = renderHook(() => useSocialCollaboration())
    await act(async () => {
      await result.current.loadConnections(1)
      await result.current.loadActivities(5)
      await result.current.shareActivity(1, 2)
      await result.current.resolveSharedActivity(10, SHARED_ACTIVITY_ACTIONS.ACCEPT)
      await result.current.loadSharedActivities()
      await result.current.loadCompatibilityMatches({
        destination: ' Lima ',
        startDate: 'a',
        endDate: 'b',
        interestsRaw: 'beach, sun ',
      })
    })
    act(() => {
      result.current.toggleInterest('beach')
      result.current.toggleInterest('beach')
    })
    expect(result.current.filteredMatches.length).toBeGreaterThan(0)
  })

  it('stores connections returned by the service and clears loading', async () => {
    const { result } = renderHook(() => useSocialCollaboration())

    await act(async () => {
      await result.current.loadConnections(12)
    })

    expect(svc.getConnections).toHaveBeenCalledWith(12)
    expect(result.current.connections).toEqual([{ id: 1, username: 'a', status: '' }])
    expect(result.current.loading.connections).toBe(false)
  })

  it('reports connection loading failures', async () => {
    svc.getConnections.mockRejectedValueOnce(new Error('Connection service unavailable'))
    const { result } = renderHook(() => useSocialCollaboration())

    await act(async () => {
      await result.current.loadConnections(12)
    })

    expect(result.current.error).toBe('Connection service unavailable')
    expect(result.current.loading.connections).toBe(false)
  })

  it('reports activity loading failures and resets loading', async () => {
    svc.getTripActivities.mockRejectedValueOnce(new Error('Activities unavailable'))
    const { result } = renderHook(() => useSocialCollaboration())

    await act(async () => {
      await result.current.loadActivities(5)
    })

    expect(result.current.error).toBe('Activities unavailable')
    expect(result.current.loading.activities).toBe(false)
  })

  it('replaces an existing shared activity when sharing returns the same id', async () => {
    const previous = { id: 10, status: 'PENDING' }
    svc.getSharedActivities.mockResolvedValueOnce([previous])
    svc.shareActivity.mockResolvedValueOnce({ id: 10, status: 'ACCEPTED' })
    const { result } = renderHook(() => useSocialCollaboration())

    await act(async () => {
      await result.current.loadSharedActivities()
      await result.current.shareActivity(1, 2)
    })

    expect(result.current.sharedActivities).toEqual([{ id: 10, status: 'ACCEPTED' }])
    expect(result.current.success).toBe('Activity shared successfully.')
    expect(result.current.loading.share).toBe(false)
  })

  it('reports sharing failures and resets the share loading state', async () => {
    svc.shareActivity.mockRejectedValueOnce(new Error('Could not share activity'))
    const { result } = renderHook(() => useSocialCollaboration())

    await act(async () => {
      await result.current.shareActivity(1, 2)
    })

    expect(result.current.error).toBe('Could not share activity')
    expect(result.current.loading.share).toBe(false)
  })

  it('reports shared activity loading failures', async () => {
    svc.getSharedActivities.mockRejectedValueOnce(new Error('Shared activities unavailable'))
    const { result } = renderHook(() => useSocialCollaboration())

    await act(async () => {
      await result.current.loadSharedActivities()
    })

    expect(result.current.error).toBe('Shared activities unavailable')
    expect(result.current.loading.resolve).toBe(false)
  })

  it('normalizes compatibility search input and filters matches by interest', async () => {
    svc.getCompatibilityMatches.mockResolvedValueOnce([
      { userId: 1, matchedInterests: ['beach', 'food'] },
      { userId: 2, matchedInterests: ['hiking'] },
    ])
    const { result } = renderHook(() => useSocialCollaboration())

    await act(async () => {
      await result.current.loadCompatibilityMatches({
        destination: ' Lima ',
        startDate: '2026-03-01',
        endDate: '2026-03-10',
        interestsRaw: 'beach, food, ',
      })
    })
    act(() => result.current.toggleInterest('beach'))

    expect(svc.getCompatibilityMatches).toHaveBeenCalledWith({
      destination: 'Lima',
      startDate: '2026-03-01',
      endDate: '2026-03-10',
      interests: ['beach', 'food'],
    })
    expect(result.current.availableInterests).toEqual(['beach', 'food', 'hiking'])
    expect(result.current.filteredMatches.map((match) => match.userId)).toEqual([1])
  })

  it('reports compatibility search failures and resets loading', async () => {
    svc.getCompatibilityMatches.mockRejectedValueOnce(new Error('Matching unavailable'))
    const { result } = renderHook(() => useSocialCollaboration())

    await act(async () => {
      await result.current.loadCompatibilityMatches({
        destination: 'Lima',
        startDate: 'a',
        endDate: 'b',
        interestsRaw: '',
      })
    })

    expect(result.current.error).toBe('Matching unavailable')
    expect(result.current.loading.matches).toBe(false)
  })
})
