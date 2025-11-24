export type SendIPCEvents =
  | 'showOverlay'
  | 'hideOverlay'
  | 'timer:start'
  | 'timer:pause'
  | 'timer:reset'
export type ReceiveIPCEvents = 'timer:tick' | 'timer:done'
