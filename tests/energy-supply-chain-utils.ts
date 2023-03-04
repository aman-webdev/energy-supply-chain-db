import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt, Address } from "@graphprotocol/graph-ts"
import {
  DistributorAdded,
  EnergyAddedByPowerPlant,
  EnergyBoughtByDistributor,
  EnergyBoughtBySubstation,
  PowerPlantAdded,
  SubstationAdded
} from "../generated/EnergySupplyChain/EnergySupplyChain"

export function createDistributorAddedEvent(
  distributorId: BigInt,
  substationId: BigInt,
  owner: Address
): DistributorAdded {
  let distributorAddedEvent = changetype<DistributorAdded>(newMockEvent())

  distributorAddedEvent.parameters = new Array()

  distributorAddedEvent.parameters.push(
    new ethereum.EventParam(
      "distributorId",
      ethereum.Value.fromUnsignedBigInt(distributorId)
    )
  )
  distributorAddedEvent.parameters.push(
    new ethereum.EventParam(
      "substationId",
      ethereum.Value.fromUnsignedBigInt(substationId)
    )
  )
  distributorAddedEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )

  return distributorAddedEvent
}

export function createEnergyAddedByPowerPlantEvent(
  powerplantId: BigInt,
  energyAdded: BigInt,
  date: BigInt
): EnergyAddedByPowerPlant {
  let energyAddedByPowerPlantEvent = changetype<EnergyAddedByPowerPlant>(
    newMockEvent()
  )

  energyAddedByPowerPlantEvent.parameters = new Array()

  energyAddedByPowerPlantEvent.parameters.push(
    new ethereum.EventParam(
      "powerplantId",
      ethereum.Value.fromUnsignedBigInt(powerplantId)
    )
  )
  energyAddedByPowerPlantEvent.parameters.push(
    new ethereum.EventParam(
      "energyAdded",
      ethereum.Value.fromUnsignedBigInt(energyAdded)
    )
  )
  energyAddedByPowerPlantEvent.parameters.push(
    new ethereum.EventParam("date", ethereum.Value.fromUnsignedBigInt(date))
  )

  return energyAddedByPowerPlantEvent
}

export function createEnergyBoughtByDistributorEvent(
  distributorId: BigInt,
  energyBought: BigInt,
  date: BigInt
): EnergyBoughtByDistributor {
  let energyBoughtByDistributorEvent = changetype<EnergyBoughtByDistributor>(
    newMockEvent()
  )

  energyBoughtByDistributorEvent.parameters = new Array()

  energyBoughtByDistributorEvent.parameters.push(
    new ethereum.EventParam(
      "distributorId",
      ethereum.Value.fromUnsignedBigInt(distributorId)
    )
  )
  energyBoughtByDistributorEvent.parameters.push(
    new ethereum.EventParam(
      "energyBought",
      ethereum.Value.fromUnsignedBigInt(energyBought)
    )
  )
  energyBoughtByDistributorEvent.parameters.push(
    new ethereum.EventParam("date", ethereum.Value.fromUnsignedBigInt(date))
  )

  return energyBoughtByDistributorEvent
}

export function createEnergyBoughtBySubstationEvent(
  substationId: BigInt,
  energyBought: BigInt,
  date: BigInt
): EnergyBoughtBySubstation {
  let energyBoughtBySubstationEvent = changetype<EnergyBoughtBySubstation>(
    newMockEvent()
  )

  energyBoughtBySubstationEvent.parameters = new Array()

  energyBoughtBySubstationEvent.parameters.push(
    new ethereum.EventParam(
      "substationId",
      ethereum.Value.fromUnsignedBigInt(substationId)
    )
  )
  energyBoughtBySubstationEvent.parameters.push(
    new ethereum.EventParam(
      "energyBought",
      ethereum.Value.fromUnsignedBigInt(energyBought)
    )
  )
  energyBoughtBySubstationEvent.parameters.push(
    new ethereum.EventParam("date", ethereum.Value.fromUnsignedBigInt(date))
  )

  return energyBoughtBySubstationEvent
}

export function createPowerPlantAddedEvent(
  powerplantId: BigInt,
  owner: Address
): PowerPlantAdded {
  let powerPlantAddedEvent = changetype<PowerPlantAdded>(newMockEvent())

  powerPlantAddedEvent.parameters = new Array()

  powerPlantAddedEvent.parameters.push(
    new ethereum.EventParam(
      "powerplantId",
      ethereum.Value.fromUnsignedBigInt(powerplantId)
    )
  )
  powerPlantAddedEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )

  return powerPlantAddedEvent
}

export function createSubstationAddedEvent(
  substationId: BigInt,
  powerplantId: BigInt,
  owner: Address
): SubstationAdded {
  let substationAddedEvent = changetype<SubstationAdded>(newMockEvent())

  substationAddedEvent.parameters = new Array()

  substationAddedEvent.parameters.push(
    new ethereum.EventParam(
      "substationId",
      ethereum.Value.fromUnsignedBigInt(substationId)
    )
  )
  substationAddedEvent.parameters.push(
    new ethereum.EventParam(
      "powerplantId",
      ethereum.Value.fromUnsignedBigInt(powerplantId)
    )
  )
  substationAddedEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )

  return substationAddedEvent
}
