import { join } from 'node:path'
import { app } from 'electron'
import { DEFAULT_YEAR, USE_MOCK_PROVIDER } from '@shared/config'
import { createEmptyState, type LiveRaceState } from '@shared/types'
import { AppTray } from './tray'
import { PanelWindow } from './panelWindow'
import { pushState, registerIpc } from './ipc'
import { RaceCache } from './raceCenter/cache'
import { RaceProvider, type RaceSource } from './raceCenter/provider'
import { MockProvider } from './mock/mockProvider'
import { Notifier } from './notifications/notifier'
import { GapTrendTracker } from './raceCenter/trends'

const envFlag = (name: string): boolean =>
  process.env[name] === '1' || process.env[name] === 'true'

const useTimeTrialMock = envFlag('MOCK_TT')
const useRestDayMock = envFlag('MOCK_REST')
const useEventsMock = envFlag('MOCK_EVENTS')
const useMock =
  USE_MOCK_PROVIDER || envFlag('MOCK') || useTimeTrialMock || useRestDayMock || useEventsMock

let tray: AppTray | undefined
let panel: PanelWindow | undefined
let source: RaceSource | undefined
let cache: RaceCache | undefined
const notifier = new Notifier()
const trends = new GapTrendTracker()
let latestState: LiveRaceState = createEmptyState(DEFAULT_YEAR)

// Single instance — a second launch just focuses the existing tray panel.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  // Menu bar only — no dock icon, no app menu window.
  app.dock?.hide()

  app.on('second-instance', () => {
    if (panel && tray) panel.showUnder(tray.getBounds())
  })

  app.whenReady().then(bootstrap).catch((err) => {
    console.error('[tdf] failed to start', err)
  })

  app.on('window-all-closed', () => {
    // Keep running in the menu bar; do not quit when the panel closes.
  })

  app.on('before-quit', () => {
    cache?.saveToDisk()
    source?.stop()
  })
}

function bootstrap(): void {
  panel = new PanelWindow()
  tray = new AppTray({
    onToggle: (bounds) => panel?.toggle(bounds),
    onRefresh: () => void source?.refresh(),
    onReconnect: () => source?.reconnect(),
    onQuit: () => app.quit(),
    notificationsEnabled: notifier.enabled,
    onSetNotifications: (enabled) => notifier.setEnabled(enabled)
  })

  const onState = (state: LiveRaceState): void => {
    trends.apply(state)
    latestState = state
    tray?.update(state)
    notifier.handle(state)
    pushState(panel?.webContents, state)
  }

  if (useMock) {
    source = new MockProvider({
      onState,
      timeTrial: useTimeTrialMock,
      restDay: useRestDayMock,
      events: useEventsMock
    })
  } else {
    cache = new RaceCache(join(app.getPath('userData'), 'race-cache.json'))
    cache.loadFromDisk()
    source = new RaceProvider({ cache, onState })
  }

  registerIpc({
    getState: () => (source ? source.getState() : latestState),
    refresh: () => void source?.refresh(),
    reconnect: () => source?.reconnect(),
    getRider: (id) => source?.getRiderDetail(id) ?? null,
    getTeam: (id) => source?.getTeamDetail(id) ?? null,
    getStageResults: (year, stageNum) =>
      source?.getStageResults(year, stageNum) ?? Promise.resolve(null)
  })

  // Persist cache periodically so a restart shows data immediately.
  if (cache) {
    setInterval(() => cache?.saveToDisk(), 60_000)
  }

  void source.start()
}
