import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import {
  IPC,
  type ExposedApi,
  type LiveRaceState,
  type RiderDetail,
  type StageResults,
  type TeamDetail
} from '@shared/types'

const api: ExposedApi = {
  onStateUpdate(cb) {
    const listener = (_e: IpcRendererEvent, state: LiveRaceState): void => cb(state)
    ipcRenderer.on(IPC.stateUpdate, listener)
    return () => ipcRenderer.removeListener(IPC.stateUpdate, listener)
  },
  requestState() {
    return ipcRenderer.invoke(IPC.requestState) as Promise<LiveRaceState>
  },
  refresh() {
    ipcRenderer.send(IPC.refresh)
  },
  reconnect() {
    ipcRenderer.send(IPC.reconnect)
  },
  requestRider(id: string) {
    return ipcRenderer.invoke(IPC.requestRider, id) as Promise<RiderDetail | null>
  },
  requestTeam(id: string) {
    return ipcRenderer.invoke(IPC.requestTeam, id) as Promise<TeamDetail | null>
  },
  requestStageResults(year: number, stageNum: number) {
    return ipcRenderer.invoke(IPC.requestStageResults, year, stageNum) as Promise<StageResults | null>
  }
}

contextBridge.exposeInMainWorld('tdf', api)
