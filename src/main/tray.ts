import { Menu, Tray } from 'electron'
import type { LiveRaceState } from '@shared/types'
import { formatTrayTitle } from './tray/formatTrayTitle'
import { createTrayIcon } from './tray/icon'

export type TrayCallbacks = {
  onToggle: (bounds: Electron.Rectangle) => void
  onRefresh: () => void
  onReconnect: () => void
  onQuit: () => void
  notificationsEnabled: boolean
  onSetNotifications: (enabled: boolean) => void
}

export class AppTray {
  private tray: Tray
  private callbacks: TrayCallbacks

  constructor(callbacks: TrayCallbacks) {
    this.callbacks = callbacks
    this.tray = new Tray(createTrayIcon())
    this.tray.setToolTip('Tour de France — live')
    this.tray.setTitle('TdF')

    // Left-click toggles the panel. We pass tray bounds so the panel can position
    // itself under the icon.
    this.tray.on('click', () => {
      this.callbacks.onToggle(this.tray.getBounds())
    })

    // Right-click (or control-click) opens a context menu with app actions.
    const menu = Menu.buildFromTemplate([
      { label: 'Open panel', click: () => this.callbacks.onToggle(this.tray.getBounds()) },
      { type: 'separator' },
      {
        label: 'Notifications',
        type: 'checkbox',
        checked: callbacks.notificationsEnabled,
        click: (item) => this.callbacks.onSetNotifications(item.checked)
      },
      { label: 'Refresh', click: () => this.callbacks.onRefresh() },
      { label: 'Reconnect', click: () => this.callbacks.onReconnect() },
      { type: 'separator' },
      { label: 'Quit TdF Menu Bar', accelerator: 'Command+Q', click: () => this.callbacks.onQuit() }
    ])
    this.tray.on('right-click', () => this.tray.popUpContextMenu(menu))
  }

  update(state: LiveRaceState): void {
    const title = formatTrayTitle(state)
    // A leading space gives the title a little breathing room from the icon.
    this.tray.setTitle(` ${title}`)
    const tip =
      state.stage?.departureCity && state.stage?.arrivalCity
        ? `Stage ${state.stage.stageNum}: ${state.stage.departureCity} → ${state.stage.arrivalCity}`
        : 'Tour de France — live'
    this.tray.setToolTip(tip)
  }

  getBounds(): Electron.Rectangle {
    return this.tray.getBounds()
  }

  destroy(): void {
    this.tray.destroy()
  }
}
