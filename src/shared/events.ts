export type SendIPCEvents =
  | 'showOverlay'
  | 'hideOverlay'
  | 'timer:start'
  | 'timer:pause'
  | 'timer:reset'
  | 'timer-break:start'
  | 'timer-break:reset'

export type ReceiveIPCEvents = 'timer:tick' | 'timer:done' | 'timer-break:tick' | 'timer-break:done'
