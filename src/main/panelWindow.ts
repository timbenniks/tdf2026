import { join } from 'node:path'
import { BrowserWindow, screen, shell } from 'electron'

const PANEL_WIDTH = 380
const PANEL_HEIGHT = 560

export class PanelWindow {
  private win: BrowserWindow

  constructor() {
    this.win = new BrowserWindow({
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
      show: false,
      frame: false,
      resizable: false,
      fullscreenable: false,
      movable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      transparent: true,
      hasShadow: true,
      vibrancy: 'sidebar',
      visualEffectState: 'active',
      webPreferences: {
        preload: join(__dirname, '../preload/index.mjs'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    this.win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

    // Open external links in the default browser, never inside the panel.
    this.win.webContents.setWindowOpenHandler(({ url }) => {
      void shell.openExternal(url)
      return { action: 'deny' }
    })

    // Surface renderer console warnings/errors in the main process log (dev aid).
    if (process.env['ELECTRON_RENDERER_URL']) {
      this.win.webContents.on('console-message', (e: unknown) => {
        const ev = e as { level?: string | number; message?: string }
        const isProblem = ev.level === 'error' || ev.level === 'warning' || ev.level === 3
        if (isProblem) console.log(`[renderer:${ev.level}] ${ev.message ?? ''}`)
      })
    }

    // Hide when the panel loses focus (classic menu-bar popover behaviour).
    this.win.on('blur', () => {
      if (!this.win.webContents.isDevToolsOpened()) this.hide()
    })

    void this.load()
  }

  private async load(): Promise<void> {
    const devUrl = process.env['ELECTRON_RENDERER_URL']
    if (devUrl) {
      await this.win.loadURL(devUrl)
    } else {
      await this.win.loadFile(join(__dirname, '../renderer/index.html'))
    }
  }

  get webContents(): Electron.WebContents {
    return this.win.webContents
  }

  isVisible(): boolean {
    return this.win.isVisible()
  }

  toggle(trayBounds: Electron.Rectangle): void {
    if (this.win.isVisible()) {
      this.hide()
    } else {
      this.showUnder(trayBounds)
    }
  }

  showUnder(trayBounds: Electron.Rectangle): void {
    const { x, y } = this.computePosition(trayBounds)
    this.win.setPosition(x, y, false)
    this.win.show()
    this.win.focus()
  }

  private computePosition(trayBounds: Electron.Rectangle): { x: number; y: number } {
    const display = screen.getDisplayNearestPoint({
      x: trayBounds.x,
      y: trayBounds.y
    })
    const work = display.workArea

    let x = Math.round(trayBounds.x + trayBounds.width / 2 - PANEL_WIDTH / 2)
    // 6px gap below the menu bar / tray icon.
    let y = Math.round(trayBounds.y + trayBounds.height + 6)

    // Keep the panel fully on-screen.
    const maxX = work.x + work.width - PANEL_WIDTH - 8
    x = Math.min(Math.max(x, work.x + 8), maxX)
    const maxY = work.y + work.height - PANEL_HEIGHT - 8
    y = Math.min(Math.max(y, work.y + 8), maxY)

    return { x, y }
  }

  hide(): void {
    this.win.hide()
  }

  destroy(): void {
    if (!this.win.isDestroyed()) this.win.destroy()
  }
}
