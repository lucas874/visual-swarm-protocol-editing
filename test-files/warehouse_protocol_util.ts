import { SwarmProtocolType } from '@actyx/machine-check'
import { MachineEvent } from '@actyx/machine-runner'
type ClosingTimePayload = { timeOfDay: string }
type PartIDPayload = {partName: string}
type PosPayload = {position: string, partName: string}
type CarPayload = {partName: string, modelName: string}

export namespace Events {
  export const partID = MachineEvent.design('partID').withPayload<PartIDPayload>()
  export const pos = MachineEvent.design('pos').withPayload<PosPayload>()
  export const time = MachineEvent.design('time').withPayload<ClosingTimePayload>()
  export const car = MachineEvent.design('car').withPayload<CarPayload>()

  export const allEvents = [partID, pos, time, car] as const
}

export const initialState = "0"