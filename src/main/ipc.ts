import { ipcMain, type WebContents } from 'electron'
import {
  IPC,
  type LiveRaceState,
  type RiderDetail,
  type StageResults,
  type TeamDetail
} from '@shared/types'

export type IpcWiring = {
  getState: () => LiveRaceState
  refresh: () => void
  reconnect: () => void
  getRider: (id: string) => RiderDetail | null
  getTeam: (id: string) => TeamDetail | null
  getStageResults: (year: number, stageNum: number) => Promise<StageResults | null>
}

export function registerIpc(wiring: IpcWiring): void {
  ipcMain.handle(IPC.requestState, () => wiring.getState())
  ipcMain.on(IPC.refresh, () => wiring.refresh())
  ipcMain.on(IPC.reconnect, () => wiring.reconnect())
  ipcMain.handle(IPC.requestRider, (_e, id: string) => wiring.getRider(id))
  ipcMain.handle(IPC.requestTeam, (_e, id: string) => wiring.getTeam(id))
  ipcMain.handle(IPC.requestStageResults, (_e, year: number, stageNum: number) =>
    wiring.getStageResults(year, stageNum)
  )
}

export function pushState(webContents: WebContents | undefined, state: LiveRaceState): void {
  if (!webContents || webContents.isDestroyed()) return
  webContents.send(IPC.stateUpdate, state)
}
