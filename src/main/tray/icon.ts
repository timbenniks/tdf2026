import { nativeImage, type NativeImage } from 'electron'

// Inlined black template tray icon (a bike wheel) at 1x and 2x. Inlining avoids any
// asset-path issues when the app is packaged. macOS recolors template images to match
// the menu bar (light/dark) automatically.
const ICON_16 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAbUlEQVR42mNgoBFIAeL1QHwNitdDxQgCB6iG/zjwNaganJr/Iim+g4Zh4n9xGYJssyQWAyTRXILhZ2TNDFgMYEAzBCVM1mNxNgMONsw767E5H5e/sYlfo6oBFHuB4kCkOBqpkpAoTspUyUwkAwCE/nyl7NRbxAAAAABJRU5ErkJggg=='
const ICON_32 =
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAA7UlEQVR42tVXyw3DIAwlu2SBHtgim7ACM2QGlmELRkFqqeReqDGmgOxaepdg7OdPwBjzp3IUnAUWcMK3rfJ24gtiQS54Vsiw5kF3qeOAOOwhrCDiGtFykcHGT3JPOK5x73KeAEtJuI6hB+ilCgbWqL2O03Ctml+VLkbgIxfRE2Rjhk7UXAJUNgIVPSdyLgEqE2gWfEPZTBAwDZseU4zM1I8SwEoRsbM9D0Rvqt8vdXSxZjw49U8EZnS/+sAuMDi6x6oiIF4C8SYU/w1VHETiR7H4ZaTiOhYfSFSMZCqGUhVjuYqHiYqnmZrH6RZ5Adub21C4v7z6AAAAAElFTkSuQmCC'

export function createTrayIcon(): NativeImage {
  const img = nativeImage.createFromBuffer(Buffer.from(ICON_16, 'base64'))
  try {
    img.addRepresentation({
      scaleFactor: 2,
      buffer: Buffer.from(ICON_32, 'base64')
    })
  } catch {
    // older electron: ignore, 1x is fine
  }
  img.setTemplateImage(true)
  return img
}
