import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import TravelDetails from './TravelDetails'
import { travelService } from '../../services/travelService'
import { socialService } from '../../services/socialService'
import { socialCollaborationService } from '../../services/socialCollaborationService'

vi.mock('../../components/TravelPlan/QuickEditModal', () => ({
  default: ({ isOpen, onClose, onUpdate }) =>
    isOpen ? (
      <div data-testid="quick-edit-stub">
        <button
          type="button"
          onClick={() => {
            onUpdate({ title: 'Plan actualizado' })
            onClose()
          }}
        >
          Guardar edicion rapida
        </button>
      </div>
    ) : null,
}))

vi.mock('../../components/Catalog/CatalogDestinationsPanel', () => {
  /* eslint-disable react/prop-types -- stub de prueba */
  return {
    CatalogDestinationsPanel: ({ onPickCatalogActivity }) => (
      <button type="button" onClick={() => onPickCatalogActivity({ name: 'Tour', description: 'City' })}>
        Elegir del catalogo
      </button>
    ),
  }
})

vi.mock('../../services/travelService', () => ({
  travelService: {
    getById: vi.fn(),
    getActivities: vi.fn(),
    updateStatus: vi.fn(),
    deleteActivity: vi.fn(),
    addActivity: vi.fn(),
    updateActivity: vi.fn(),
    getCompatibleTravelers: vi.fn().mockResolvedValue([]),
    getActivitiesByGeo: vi.fn().mockResolvedValue({ data: [] }),
    getHotelsByCity: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

const navigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

vi.mock('../../contexts/use-auth.js', () => ({
  useAuth: () => ({ user: { id: 1 } }),
}))

vi.mock('../../services/socialService', () => ({
  socialService: {
    getTravelerSummary: vi.fn().mockResolvedValue({}),
    sendConnectionRequest: vi.fn().mockResolvedValue({}),
    getUserConnections: vi.fn().mockResolvedValue([
      { connectedUserId: 88, firstName: 'Bo', lastName: 'D', username: 'bod' },
    ]),
  },
}))

vi.mock('../../services/socialCollaborationService', () => ({
  socialCollaborationService: {
    getSharedActivities: vi.fn().mockResolvedValue([]),
    shareActivity: vi.fn().mockResolvedValue({ id: 10, status: 'PENDING' }),
    shareAllActivities: vi.fn().mockResolvedValue([]),
    updateSharedActivity: vi.fn().mockResolvedValue({ id: 10, status: 'ACCEPTED' }),
  },
}))

vi.mock('../../services/aiService', () => ({
  aiService: {
    getBuddyRecommendations: vi.fn().mockResolvedValue({ recommendations: [] }),
  },
}))

const mockPlan = {
  id: 7,
  title: 'Details plan',
  description: 'Test',
  destinationLocation: 'Rome',
  originLocation: 'Madrid',
  startDate: '2026-03-01',
  endDate: '2026-03-15',
  numberOfTravelers: 2,
  estimatedBudget: 1200,
  createdAt: '2026-01-01',
  status: 'PLANNING',
  activities: [
    {
      id: 'a1',
      name: 'Coliseo',
      type: 'sight',
      location: 'Rome',
      description: 'Tour',
      estimatedCost: 50,
      startTime: '2026-03-02T10:00:00.000Z',
      endTime: '2026-03-02T12:00:00.000Z',
    },
  ],
}

function renderAt(path = '/travel-plans/7') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/travel-plans/:id" element={<TravelDetails />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TravelDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    navigate.mockClear()
    travelService.getById.mockResolvedValue({ ...mockPlan })
    travelService.getActivities.mockResolvedValue(mockPlan.activities)
    travelService.updateStatus.mockImplementation(async (_id, st) => ({ ...mockPlan, status: st }))
    travelService.addActivity.mockResolvedValue({
      id: 'new1',
      name: 'Nueva',
      startTime: '2026-03-05T15:00:00.000Z',
      endTime: '2026-03-05T16:00:00.000Z',
    })
    travelService.deleteActivity.mockResolvedValue(undefined)
    travelService.getCompatibleTravelers.mockResolvedValue([
      { userId: 88, firstName: 'Bo', lastName: 'D', username: 'bod', compatibilityScore: 0.6 },
    ])
    socialService.getTravelerSummary.mockResolvedValue({ bio: 'Bio' })
  })

  it('renders plan after load', async () => {
    renderAt()
    await waitFor(() => expect(travelService.getById).toHaveBeenCalledWith('7'))
    expect(travelService.getActivities).toHaveBeenCalledWith('7')
    await waitFor(() => expect(screen.getByText('Details plan')).toBeInTheDocument())
  })

  it('loads activities separately when the plan response omits them', async () => {
    travelService.getById.mockResolvedValueOnce({ ...mockPlan, activities: undefined })
    travelService.getActivities.mockResolvedValueOnce(mockPlan.activities)
    renderAt()
    await waitFor(() => expect(screen.getByText('Coliseo')).toBeInTheDocument())
  })

  it('muestra error si falla la carga', async () => {
    travelService.getById.mockRejectedValueOnce(new Error('404'))
    renderAt()
    await waitFor(() => expect(screen.getByText('404')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Volver/i }))
    expect(navigate).toHaveBeenCalledWith(-1)
  })

  it('cambia estado del plan', async () => {
    travelService.updateStatus.mockResolvedValueOnce({ ...mockPlan, activities: undefined, status: 'ACTIVE' })
    renderAt()
    await waitFor(() => expect(screen.getByText('Details plan')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Marcar Active/i }))
    await waitFor(() => expect(travelService.updateStatus).toHaveBeenCalledWith('7', 'ACTIVE'))
    expect(screen.getByText('Coliseo')).toBeInTheDocument()
  })

  it('elimina actividad con confirmacion', async () => {
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
    renderAt()
    await waitFor(() => expect(screen.getByText('Coliseo')).toBeInTheDocument())
    await userEvent.click(screen.getAllByTitle('Eliminar')[0])
    await waitFor(() => expect(travelService.deleteActivity).toHaveBeenCalledWith('7', 'a1'))
    confirmSpy.mockRestore()
  })

  it('agrega actividad desde el modal', async () => {
    travelService.getById.mockResolvedValueOnce({ ...mockPlan, activities: [] })
    travelService.getActivities.mockResolvedValueOnce([])
    renderAt()
    await waitFor(() => expect(screen.getByText(/Aun no hay actividades/i)).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Agregar/i }))
    await userEvent.type(screen.getByLabelText(/Nombre de actividad/i), 'Nueva')
    await userEvent.type(screen.getByLabelText(/Hora inicio/i), '2026-03-05T10:00')
    await userEvent.type(screen.getByLabelText(/Hora fin/i), '2026-03-05T11:00')
    await userEvent.click(screen.getByRole('button', { name: /Agregar actividad/i }))
    await waitFor(() => expect(travelService.addActivity).toHaveBeenCalled())
  })

  it('catalogo rellena prefill y abre modal', async () => {
    travelService.getById.mockResolvedValueOnce({ ...mockPlan, activities: [] })
    travelService.getActivities.mockResolvedValueOnce([])
    renderAt()
    await waitFor(() => expect(screen.getByRole('button', { name: /Elegir del catalogo/i })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Elegir del catalogo/i }))
    expect(screen.getByLabelText(/Nombre de actividad/i)).toHaveValue('Tour')
  })

  it('busca viajeros compatibles', async () => {
    renderAt()
    await waitFor(() => expect(screen.getByText('Details plan')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /^Buscar$/i }))
    await waitFor(() => expect(travelService.getCompatibleTravelers).toHaveBeenCalledWith('7'))
    await waitFor(
      () => expect(screen.getByRole('heading', { name: /Bo D/i })).toBeInTheDocument(),
      { timeout: 5000 },
    )
  })

  it('conectar con viajero compatible', async () => {
    const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})
    renderAt()
    await waitFor(() => expect(screen.getByText('Details plan')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /^Buscar$/i }))
    await waitFor(
      () => expect(screen.getByRole('heading', { name: /Bo D/i })).toBeInTheDocument(),
      { timeout: 5000 },
    )
    await userEvent.click(screen.getByRole('button', { name: /Conectar/i }))
    await waitFor(() => expect(socialService.sendConnectionRequest).toHaveBeenCalled())
    expect(alertSpy).toHaveBeenCalled()
    alertSpy.mockRestore()
  })

  it('abre edicion rapida', async () => {
    renderAt()
    await waitFor(() => expect(screen.getByText('Details plan')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Editar plan/i }))
    expect(screen.getByTestId('quick-edit-stub')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Guardar edicion rapida/i }))
    await waitFor(() => expect(screen.getByText('Plan actualizado')).toBeInTheDocument())
  })

  it('vuelve a mis viajes desde breadcrumb', async () => {
    renderAt()
    await waitFor(() => expect(screen.getByText('Details plan')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Mis viajes/i }))
    expect(navigate).toHaveBeenCalledWith('/my-travels')
  })

  it('muestra el boton compartir y envia una actividad', async () => {
    renderAt()
    await waitFor(() => expect(screen.getByText('Coliseo')).toBeInTheDocument())
    await userEvent.click(screen.getByTitle('Compartir actividad'))
    await waitFor(() => expect(screen.getByLabelText(/Viajero/i)).toBeInTheDocument())
    await userEvent.selectOptions(screen.getByLabelText(/Viajero/i), '88')
    await userEvent.click(screen.getByRole('button', { name: 'Compartir' }))
    await waitFor(() =>
      expect(socialCollaborationService.shareActivity).toHaveBeenCalledWith('a1', 88)
    )
  })

  it('comparte todas las actividades del plan', async () => {
    renderAt()
    await waitFor(() => expect(screen.getByText('Coliseo')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Compartir todas/i }))
    await waitFor(() => expect(screen.getByLabelText(/Viajero/i)).toBeInTheDocument())
    await userEvent.selectOptions(screen.getByLabelText(/Viajero/i), '88')
    await userEvent.click(screen.getByRole('button', { name: 'Compartir' }))
    await waitFor(() =>
      expect(socialCollaborationService.shareAllActivities).toHaveBeenCalledWith('7', 88)
    )
  })

  it('mantiene las acciones de solicitudes compartidas debajo del detalle', async () => {
    socialCollaborationService.getSharedActivities.mockResolvedValueOnce([{
      id: 21,
      activityId: 31,
      senderId: 88,
      receiverId: 1,
      status: 'PENDING',
      activityName: 'Walking tour — Paris',
      activityDescription: 'Actividad compartida para una demostración.',
      activityLocation: 'Paris',
      activityStartTime: '2026-03-04T10:00:00',
      activityEndTime: '2026-03-04T12:00:00',
    }])

    renderAt()

    const sharedItem = await screen.findByText('Walking tour — Paris')
    const card = sharedItem.closest('.shared-activity-item')
    expect(card).toBeInTheDocument()
    expect(card.querySelector('.shared-activity-actions')).toBeInTheDocument()
    expect(card.querySelector('.shared-activity-actions')).toContainElement(
      screen.getByRole('button', { name: /Aceptar/i })
    )
  })

  it('agrega la actividad compartida al plan al aceptarla', async () => {
    socialCollaborationService.getSharedActivities.mockResolvedValueOnce([{
      id: 21,
      activityId: 31,
      senderId: 88,
      receiverId: 1,
      status: 'PENDING',
      activityName: 'Walking tour — Paris',
      activityDescription: 'Tour guiado',
      activityLocation: 'Paris',
      activityStartTime: '2026-03-04T10:00:00',
      activityEndTime: '2026-03-04T12:00:00',
    }])
    travelService.addActivity.mockResolvedValueOnce({
      id: 'new-shared-activity',
      name: 'Walking tour — Paris',
    })

    renderAt()
    await userEvent.click(await screen.findByRole('button', { name: /Aceptar/i }))

    await waitFor(() => {
      expect(socialCollaborationService.updateSharedActivity).toHaveBeenCalledWith(21, 'ACCEPT')
      expect(travelService.addActivity).toHaveBeenCalledWith('7', {
        name: 'Walking tour — Paris',
        description: 'Tour guiado',
        location: 'Paris',
        startTime: '2026-03-04T10:00:00',
        endTime: '2026-03-04T12:00:00',
      })
    })
    expect(await screen.findByText('Walking tour — Paris')).toBeInTheDocument()
  })

  it('permite agregar al plan una actividad que ya estaba aceptada', async () => {
    socialCollaborationService.getSharedActivities.mockResolvedValueOnce([{
      id: 22,
      activityId: 32,
      senderId: 88,
      receiverId: 1,
      status: 'ACCEPTED',
      activityName: 'Walking tour — Paris',
      activityDescription: 'Tour guiado',
      activityLocation: 'Paris',
      activityStartTime: '2026-03-04T10:00:00',
      activityEndTime: '2026-03-04T12:00:00',
    }])
    travelService.addActivity.mockResolvedValueOnce({
      id: 'new-shared-activity',
      name: 'Walking tour — Paris',
    })

    renderAt()
    await userEvent.click(await screen.findByRole('button', { name: /Agregar a este plan/i }))

    await waitFor(() =>
      expect(travelService.addActivity).toHaveBeenCalledWith('7', {
        name: 'Walking tour — Paris',
        description: 'Tour guiado',
        location: 'Paris',
        startTime: '2026-03-04T10:00:00',
        endTime: '2026-03-04T12:00:00',
      })
    )
  })

  it('no duplica una actividad compartida que ya está en el plan', async () => {
    socialCollaborationService.getSharedActivities.mockResolvedValueOnce([{
      id: 21,
      activityId: 'a1',
      senderId: 88,
      receiverId: 1,
      status: 'PENDING',
      activityName: 'Coliseo',
      activityStartTime: '2026-03-04T10:00:00',
      activityEndTime: '2026-03-04T12:00:00',
    }])

    renderAt()
    await userEvent.click(await screen.findByRole('button', { name: /Aceptar/i }))

    await waitFor(() =>
      expect(socialCollaborationService.updateSharedActivity).toHaveBeenCalledWith(21, 'ACCEPT')
    )
    expect(travelService.addActivity).not.toHaveBeenCalled()
  })
})
