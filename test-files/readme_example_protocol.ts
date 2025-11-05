import { MachineEvent, SwarmProtocol } from '@actyx/machine-runner'
import { SwarmProtocolType } from '@actyx/machine-check'

export const manifest = {
  appId: 'com.example.warehouse-factory',
  displayName: 'warehouse-factory',
  version: '1.0.0',
}

export namespace Events {
    // sent by the warehouse to get things started
    export const request = MachineEvent.design('request')
        .withPayload<{ id: string; from: string; to: string }>()
    // sent by each available candidate transport robot to register interest
    export const bid = MachineEvent.design('bid')
        .withPayload<{ robot: string; delay: number, id: string }>()
    // sent by the transport robots
    export const selected = MachineEvent.design('selected')
        .withPayload<{ winner: string, id: string }>()
    // sent by the transport robot performing the delivery
    export const deliver = MachineEvent.design('deliver')
        .withPayload<{ id: string }>()
    // sent by the warehouse to acknowledge delivery
    export const ack = MachineEvent.design('acknowledge')
        .withPayload<{ id: string }>()
    // sent by the assembly robot when a product has been assembled
    export const product = MachineEvent.design('product')
        .withPayload<{productName: string}>()

    // declare a precisely typed tuple of all events we can now choose from
    export const allEvents = [request, bid, selected, deliver, ack, product] as const
}

export const TransportOrder = SwarmProtocol.make('warehouse-factory', Events.allEvents)

export const transportOrderProtocol = {
  initial: 'initial',
  transitions: [
    {source: 'initial', target: 'auction', label: {cmd: 'request', role: 'warehouse', logType: [Events.request.type]}},
    {source: 'auction', target: 'auction', label: {cmd: 'bid', role: 'transportRobot', logType: [Events.bid.type]}},
    {source: 'auction', target: 'delivery', label: {cmd: 'select', role: 'transportRobot', logType: [Events.selected.type]}},
    {source: 'delivery', target: 'delivered', label: {cmd: 'deliver', role: 'transportRobot', logType: [Events.deliver.type]}},
    {source: 'delivered', target: 'acknowledged', label: {cmd: 'acknowledge', role: 'warehouse', logType: [Events.ack.type]}},
  ]
}

export const assemblyLineProtocol = {
  initial: 'initial',
  transitions: [
    {source: 'initial', target: 'wait', label: { cmd: 'request', role: 'warehouse', logType: [Events.request.type]}},
    {source: 'wait', target: 'assemble', label: { cmd: 'acknowledge', role: 'warehouse', logType: [Events.ack.type]}},
    {source: 'assemble', target: 'done', label: { cmd: 'assemble', role: 'assemblyRobot', logType: [Events.product.type] }},
  ]
}