import { Powerplant, DailyEnergy, Substation } from "./../generated/schema";
import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  EnergySupplyChain,
  DistributorAdded,
  EnergyAddedByPowerPlant,
  EnergyBoughtByDistributor,
  EnergyBoughtBySubstation,
  PowerPlantAdded,
  SubstationAdded,
} from "../generated/EnergySupplyChain/EnergySupplyChain";

export function handleDistributorAdded(event: DistributorAdded): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  // let entity = ExampleEntity.load(event.transaction.from)
  // // Entities only exist after they have been saved to the store;
  // // `null` checks allow to create entities on demand
  // if (!entity) {
  //   entity = new ExampleEntity(event.transaction.from)
  //   // Entity fields can be set using simple assignments
  //   entity.count = BigInt.fromI32(0)
  // }
  // // BigInt and BigDecimal math are supported
  // entity.count = entity.count + BigInt.fromI32(1)
  // // Entity fields can be set based on event parameters
  // entity.distributorId = event.params.distributorId
  // entity.substationId = event.params.substationId
  // // Entities can be written to the store with `.save()`
  // entity.save()
  // // Note: If a handler doesn't require existing field values, it is faster
  // // _not_ to load the entity from the store. Instead, create it fresh with
  // // `new Entity(...)`, set the fields that should be updated and save the
  // // entity back to the store. Fields that were not set or unset remain
  // // unchanged, allowing for partial updates to be applied.
  // // It is also possible to access smart contracts from mappings. For
  // // example, the contract that has emitted the event can be connected to
  // // with:
  // //
  // // let contract = Contract.bind(event.address)
  // //
  // // The following functions can then be called on this contract to access
  // // state variables and other data:
  // //
  // // - contract.distributorAddressToIds(...)
  // // - contract.distributors(...)
  // // - contract.getDistributorById(...)
  // // - contract.getDistributorEnergyBoguhtByDay(...)
  // // - contract.getPowerPlantEnergyProducedByDay(...)
  // // - contract.getPowerPlantEnergySoldByDay(...)
  // // - contract.getPowerplantById(...)
  // // - contract.getSubstationById(...)
  // // - contract.getSubstationEnergyBoughtByDay(...)
  // // - contract.getSubstationEnergySoldByDay(...)
  // // - contract.getSubstationsOfPowerPlant(...)
  // // - contract.powerPlants(...)
  // // - contract.powerPlantsAddressToIds(...)
  // // - contract.substations(...)
  // // - contract.substationsAddressToIds(...)
}

export function handleEnergyAddedByPowerPlant(
  event: EnergyAddedByPowerPlant
): void {
  const powerPlantIndex = event.params.powerplantId;
  const energyAdded = event.params.energyAdded;
  let currentDate = event.block.timestamp.toU64() / 86400;
  const stringDate = new Date(currentDate * 86400 * 1000)
    .toISOString()
    .split("T")[0];
  const dailyEnergyProducedId = `Powerplant-${powerPlantIndex}-${stringDate}-Produced`;
  const powerplant = Powerplant.load(`Powerplant-${powerPlantIndex}`);
  if (powerplant) {
    let dailyEnergyProduced = DailyEnergy.load(dailyEnergyProducedId);
    if (dailyEnergyProduced) {
      dailyEnergyProduced.amount = energyAdded.plus(dailyEnergyProduced.amount);
    } else {
      dailyEnergyProduced = new DailyEnergy(dailyEnergyProducedId);
      dailyEnergyProduced.amount = energyAdded;
      dailyEnergyProduced.timestamp = event.block.timestamp;
      dailyEnergyProduced.date = stringDate;
      dailyEnergyProduced.type = "Powerplant";
      dailyEnergyProduced.address = event.transaction.from;
      dailyEnergyProduced.userId = powerPlantIndex;
      dailyEnergyProduced.actionType = "Produced";
      let energiesProduced = powerplant.energiesProducedByDate;
      if (!energiesProduced) {
        energiesProduced = new Array<string>();
      }
      energiesProduced.push(dailyEnergyProduced.id);
      powerplant.energiesProducedByDate = energiesProduced;
    }
    dailyEnergyProduced.save();
    powerplant.totalEnergyProduced = powerplant.totalEnergyProduced.plus(
      energyAdded
    );
    powerplant.energyAvailableToBuy = powerplant.energyAvailableToBuy.plus(
      energyAdded
    );
    powerplant.save();
  }
}

export function handleEnergyBoughtByDistributor(
  event: EnergyBoughtByDistributor
): void {}

export function handleEnergyBoughtBySubstation(
  event: EnergyBoughtBySubstation
): void {
  const substationTicker = event.params.substationId;
  const energyBought = event.params.energyBought;
  const substationContract = EnergySupplyChain.bind(event.address);
  const contractInfo = substationContract.getSubstationById(substationTicker);
  const powerplantContractInfo = substationContract.getPowerplantById(contractInfo.powerplantId)
  const substationId = `Substation-${substationTicker}`;
  const substation = Substation.load(substationId);
  const powerplant = Powerplant.load(`Powerplant-${contractInfo.powerplantId}`);
  let currentTime = event.block.timestamp.toU64() / 86400;
  const stringDate = new Date(currentTime * 86400 * 1000)
    .toISOString()
    .split("T")[0];
  let dailyEnergyBoughtBySubstation = DailyEnergy.load(`Substation-${substationTicker}-${stringDate}-Bought`);
  if (!dailyEnergyBoughtBySubstation) {
    dailyEnergyBoughtBySubstation = new DailyEnergy(`Substation-${substationTicker}-${stringDate}-Bought`);dailyEnergyBoughtBySubstation.actionType = "Bought";
    dailyEnergyBoughtBySubstation.address = contractInfo.substationAddress;
    dailyEnergyBoughtBySubstation.amount = energyBought;
    dailyEnergyBoughtBySubstation.date = stringDate;
    dailyEnergyBoughtBySubstation.timestamp = event.block.timestamp;
    dailyEnergyBoughtBySubstation.type = "Substation";
    dailyEnergyBoughtBySubstation.userId = substationTicker;
  }else{
    dailyEnergyBoughtBySubstation.amount=dailyEnergyBoughtBySubstation.amount.plus(energyBought)
  }
  dailyEnergyBoughtBySubstation.save();
  log.info("Substation iD: {}",[substationId])
  if (substation) {
    log.info("IN substation",[])
    substation.energyAvailableToBuy = substation.energyAvailableToBuy.plus(
      energyBought
    );
    substation.totalEnergyBought = substation.totalEnergyBought.plus(
      energyBought
    );
    
  
    let energiesBought = substation.energiesBoughtByDate;
    if (!energiesBought) {
      energiesBought = new Array<string>();
    }
    energiesBought.push(dailyEnergyBoughtBySubstation.id)
    substation.energiesBoughtByDate=energiesBought
    substation.save();
  }
  if(powerplant){
    powerplant.energyAvailableToBuy = powerplant.energyAvailableToBuy.minus(energyBought)
    powerplant.totalEnergySold = powerplant.totalEnergySold.plus(energyBought)
    let dailyEnergySold = DailyEnergy.load(`Powerplant-${contractInfo.powerplantId}-${stringDate}-Sold`)
    if(!dailyEnergySold){
      dailyEnergySold = new DailyEnergy(`Powerplant-${contractInfo.powerplantId}-${stringDate}-Sold`)
      dailyEnergySold.actionType="Sold"
      dailyEnergySold.amount=energyBought
      dailyEnergySold.date=stringDate
      dailyEnergySold.timestamp=event.block.timestamp
      dailyEnergySold.userId=contractInfo.powerplantId
      dailyEnergySold.type="Powerplant"
      dailyEnergySold.address = powerplantContractInfo.powerplantAddress
      let powerplantEnergiesSold = powerplant.energiesSoldByDate
      if(!powerplantEnergiesSold) powerplantEnergiesSold = new Array<string>();
      powerplantEnergiesSold.push(dailyEnergySold.id)
      powerplant.energiesSoldByDate=powerplantEnergiesSold
    }
    else {
      dailyEnergySold.amount = dailyEnergySold.amount.plus(energyBought)
      
    }
    dailyEnergySold.save()
    powerplant.save()
   
  }
}

export function handlePowerPlantAdded(event: PowerPlantAdded): void {
  let creator = event.params.owner;
  let powerplantTicker = event.params.powerplantId;
  let contract = EnergySupplyChain.bind(event.address);
  let powerplantFromContract = contract.getPowerplantById(powerplantTicker);

  let entity = new Powerplant(`Powerplant-${powerplantTicker}`);
  entity.name = powerplantFromContract.name;
  entity.area = powerplantFromContract.area;
  entity.addedAt = event.block.timestamp;
  entity.owner = creator;
  entity.totalEnergyProduced = powerplantFromContract.totalEnergyProduced;
  entity.totalEnergySold = powerplantFromContract.totalEnergySold;
  entity.energyAvailableToBuy = powerplantFromContract.energyAvailableToBuy;
  entity.number = powerplantTicker.toI32();
  entity.addedAt = event.block.timestamp;
  let currentTime = event.block.timestamp.toU64() / 86400;
  const stringDate = new Date(currentTime * 86400 * 1000)
    .toISOString()
    .split("T")[0];
  let dailyEnergyProduced = DailyEnergy.load(
    `Powerplant-${event.params.powerplantId}-${stringDate}-Produced`
  );
  if (!dailyEnergyProduced) {
    dailyEnergyProduced = new DailyEnergy(
      `Powerplant-${event.params.powerplantId}-${stringDate}-Produced`
    );
    dailyEnergyProduced.amount = powerplantFromContract.totalEnergyProduced;
    dailyEnergyProduced.timestamp = event.block.timestamp;
    dailyEnergyProduced.date = stringDate;
    dailyEnergyProduced.type = "Powerplant";
    dailyEnergyProduced.address = powerplantFromContract.powerplantAddress;
    dailyEnergyProduced.userId = event.params.powerplantId;
    dailyEnergyProduced.actionType = "Produced";
    dailyEnergyProduced.save();
    let energiesProduced = entity.energiesProducedByDate;
    if (!energiesProduced) {
      energiesProduced = new Array<string>();
    }
    energiesProduced.push(dailyEnergyProduced.id);
    entity.energiesProducedByDate = energiesProduced;
  }
  entity.save();
}

export function handleSubstationAdded(event: SubstationAdded): void {
  let creator = event.params.owner;
  let substationTicker = event.params.substationId;
  let powerplantTicker = event.params.powerplantId;
  let contract = EnergySupplyChain.bind(event.address);
  let substationFromContract = contract.getSubstationById(substationTicker);

  let entity = new Substation(`Substation-${substationTicker}`);
  entity.name = substationFromContract.name;
  entity.area = substationFromContract.area;
  entity.addedAt = event.block.timestamp;
  entity.owner = creator;
  entity.totalEnergyBought = substationFromContract.totalEnergyReceived;
  entity.totalEnergySold = substationFromContract.totalEnergySold;
  entity.energyAvailableToBuy = substationFromContract.energyAvailableToBuy;
  entity.number = substationTicker.toI32();
  entity.addedAt = event.block.timestamp;
  let powerplant = Powerplant.load(`Powerplant-${powerplantTicker}`);
  if (powerplant) {
    entity.powerplant = powerplant.id;
    let powerplantSubstations = powerplant.substations;
    if (!powerplantSubstations) {
      powerplantSubstations = new Array<string>();
    }
    powerplantSubstations.push(entity.id);
    powerplant.substations = powerplantSubstations;
    powerplant.save();
  }
  entity.save();
}
