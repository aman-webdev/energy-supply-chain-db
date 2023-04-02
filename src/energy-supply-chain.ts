import { ConsumerCancelledElectricity } from './../generated/EnergySupplyChain/EnergySupplyChain';
import { Powerplant, DailyEnergy, Substation,Distributor,Consumer,ConsumerPayment } from "./../generated/schema";
import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  EnergySupplyChain,
  DistributorAdded,
  EnergyAddedByPowerPlant,
  EnergyBoughtByDistributor,
  EnergyBoughtBySubstation,
  PowerPlantAdded,
  SubstationAdded,
  DistributorConnectedToSubstation,SubstationConnectedToPowerPlant,ConsumerAdded,ConsumerConnectedToDistributor,ElectricityPaidByConsumer,UpdateUnitsConsumedRan
} from "../generated/EnergySupplyChain/EnergySupplyChain";

export function handleDistributorAdded(event: DistributorAdded): void {
  let creator = event.params.owner;
  let distributorTicker = event.params.distributorId;
  let contract = EnergySupplyChain.bind(event.address);
  let distributorFromContract = contract.getDistributorById(distributorTicker);

  let entity = new Distributor(`Distributor-${distributorTicker}`);
  entity.name = distributorFromContract.name;
  entity.area = distributorFromContract.area;
  entity.addedAt = event.block.timestamp;
  entity.owner = creator;
  entity.totalEnergyBought = distributorFromContract.totalEnergyBought;
  entity.totalEnergySold = distributorFromContract.totalEnergySold;
  entity.energyAvailableToBuy = event.params.energyAvailableToBuy;
  entity.number = distributorTicker.toI32();
  entity.addedAt = event.block.timestamp;
  entity.isElectricitySupply = event.params.energyAvailableToBuy.toI64() ? true:false;
  entity.toShowLessEnergyWarning = false;
  entity.save();
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
): void {
  const distributorTicker = event.params.distributorId
  const energyBought = event.params.energyBought
  const distributorContract = EnergySupplyChain.bind(event.address)
  const distributorInfo = distributorContract.getDistributorById(distributorTicker)
  const substationInfo = distributorContract.getSubstationById(distributorInfo.substationId)
  const distributorId = `Distributor-${distributorTicker}`
  const distributor = Distributor.load(distributorId)
  const substation = Substation.load(`Substation-${distributorInfo.substationId}`)
  let currentTime = event.block.timestamp.toU64() / 86400;
  const stringDate = new Date(currentTime * 86400 * 1000)
    .toISOString()
    .split("T")[0];
   // check if the energy entity bought for today exists for distributor
   let dailyEnergyBoughtByDistributor = DailyEnergy.load(`Distributor-${distributorTicker}-${stringDate}-Bought`)
   if(!dailyEnergyBoughtByDistributor){
    // if it doesnt exist create one entity for today
    dailyEnergyBoughtByDistributor = new DailyEnergy(`Distributor-${distributorTicker}-${stringDate}-Bought`)
    dailyEnergyBoughtByDistributor.amount = energyBought
    dailyEnergyBoughtByDistributor.timestamp = event.block.timestamp
    dailyEnergyBoughtByDistributor.date= stringDate
    dailyEnergyBoughtByDistributor.type='Distributor'
    dailyEnergyBoughtByDistributor.actionType='Bought'
    dailyEnergyBoughtByDistributor.address = distributorInfo.distributorAddress
    dailyEnergyBoughtByDistributor.userId = distributorTicker
   }else{
    // if exists just add the new amount to already exisiting energy bought
    dailyEnergyBoughtByDistributor.amount = dailyEnergyBoughtByDistributor.amount.plus(energyBought)
   }
   dailyEnergyBoughtByDistributor.save()

   // now we update the distributor to add this date and total energies
   if(distributor){
    distributor.totalEnergyBought = distributor.totalEnergyBought.plus(energyBought)
    distributor.energyAvailableToBuy = distributor.energyAvailableToBuy.plus(energyBought)
    distributor.isElectricitySupply=true;
    let energiesBought = distributor.energiesBoughtByDate
    if (!energiesBought) {
      energiesBought = new Array<string>();
    }
    if(!energiesBought.includes(dailyEnergyBoughtByDistributor.id)){
      energiesBought.push(dailyEnergyBoughtByDistributor.id)
    }
    log.info("Energies bought -> Distributor ------- : {}",[energiesBought.length.toString()])
    distributor.energiesBoughtByDate=energiesBought
    distributor.save();
   }

   // now update the substation with the energy sold amount

   if(substation){
    substation.totalEnergySold=substation.totalEnergySold.plus(energyBought)
    substation.energyAvailableToBuy = substation.energyAvailableToBuy.minus(energyBought)
    let dailyEnergySold = DailyEnergy.load(`Substation-${distributorInfo.substationId}-${stringDate}-Sold`)
    if(!dailyEnergySold){
      dailyEnergySold = new DailyEnergy(`Substation-${distributorInfo.substationId}-${stringDate}-Sold`)
      dailyEnergySold.actionType="Sold"
      dailyEnergySold.amount=energyBought
      dailyEnergySold.date=stringDate
      dailyEnergySold.timestamp=event.block.timestamp
      dailyEnergySold.userId=distributorInfo.substationId
      dailyEnergySold.type="Substation"
      dailyEnergySold.address = substationInfo.substationAddress
      let substationEnergiesSold = substation.energiesSoldByDate
      if(!substationEnergiesSold) substationEnergiesSold = new Array<string>();
      substationEnergiesSold.push(dailyEnergySold.id)
      substation.energiesSoldByDate=substationEnergiesSold
    }
    else {
      dailyEnergySold.amount = dailyEnergySold.amount.plus(energyBought)
      
    }
    dailyEnergySold.save()
    substation.save()
   }
}

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
    dailyEnergyBoughtBySubstation.actionType='Bought'
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
    if(!energiesBought.includes(dailyEnergyBoughtBySubstation.id)){
      energiesBought.push(dailyEnergyBoughtBySubstation.id)
    }
    log.info("ENergies bought ------- : {}",[energiesBought.length.toString()])
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
  let contract = EnergySupplyChain.bind(event.address);
  let substationFromContract = contract.getSubstationById(substationTicker);

  let entity = new Substation(`Substation-${substationTicker}`);
  entity.name = substationFromContract.name;
  entity.area = substationFromContract.area;
  entity.addedAt = event.block.timestamp;
  entity.owner = creator;
  entity.totalEnergyBought = substationFromContract.totalEnergyReceived;
  entity.totalEnergySold = substationFromContract.totalEnergySold;
  entity.energyAvailableToBuy = event.params.energyAvailableToBuy;
  entity.number = substationTicker.toI32();
  entity.addedAt = event.block.timestamp;
  entity.save();
}

export function handleSubstationConnectedToPowerPlant(
  event: SubstationConnectedToPowerPlant
): void {
  const substationId = event.params.substationId;
  const powerplantId = event.params.powerPlantId;
  const prevPowerplantId = event.params.prevPowerplantId;
  const substation = Substation.load(`Substation-${substationId}`);
  if (substation) {
    substation.powerplant = `Powerplant-${powerplantId}`;
    // means substation changed the power plant to another power plant
    if (prevPowerplantId.toI32() !== 0) {
      const prevPlant = Powerplant.load(`Powerplant-${prevPowerplantId}`);
      if (prevPlant) {
        let prevPlantSubstations = prevPlant.substations;
        if (prevPlantSubstations) {
          const index = prevPlantSubstations.indexOf(substation.id)
          log.info("Index of Substation found at ------ :{}",[index.toString()])
          prevPlantSubstations.splice(index, 1)
          prevPlant.substations = prevPlantSubstations;
          prevPlant.save();
        }
      }
    }
    const newPlant = Powerplant.load(`Powerplant-${powerplantId}`)
    if(newPlant){
      let newPlantSubstations = newPlant.substations
      if(!newPlantSubstations){
        newPlantSubstations =  new Array<string>();
      }
      newPlantSubstations.push(`Substation-${substationId}`)
      newPlant.substations = newPlantSubstations
      newPlant.save()
    }
    substation.save()
  }
}
export function handleDistributorConnectedToSubstation(
  event: DistributorConnectedToSubstation
): void {
  const distributorId = event.params.distributorId;
  const substationId = event.params.substationId
  const prevSubstationId = event.params.prevSubstationId
  const distributor = Distributor.load(`Distributor-${distributorId}`)
  if(distributor){
    // update the substation connected to distributor to a new one
    distributor.substation = `Substation-${substationId}`
    // now we check if there already exists a previous substation connected to distributor -> if yes remove the distributor from that substation
    const prevSubstation = Substation.load(`Substation-${prevSubstationId}`)
    if(prevSubstation){
      const prevSubstationDistributors = prevSubstation.distributors
      if(prevSubstationDistributors){
          const index = prevSubstationDistributors.indexOf(distributor.id)
          prevSubstationDistributors.splice(index,1)
          prevSubstation.distributors = prevSubstationDistributors
          prevSubstation.save()   
      }
    }
    const newSubstation = Substation.load(`Substation-${substationId}`)
    if(newSubstation){
      let newDistributors = newSubstation.distributors
      if(!newDistributors){
        newDistributors = new Array<string>();
      }
      newDistributors.push(distributor.id)
      newSubstation.distributors=newDistributors
      newSubstation.save()
    }
    distributor.save()
  }
}

export function handleConsumerAdded(
  event: ConsumerAdded
): void {
  let creator = event.params.owner;
  let consumerTicker = event.params.consumerId;
  let contract = EnergySupplyChain.bind(event.address);
  log.info("Consumer Ticker : {}",[consumerTicker.toString()])
  let consumerFromContract = contract.getConsumerById(consumerTicker);
  let entity = new Consumer(`Consumer-${consumerTicker}`);
  entity.name = consumerFromContract.name;
  entity.number = consumerTicker.toI32();
  entity.owner = creator;
  entity.totalEnergyBought = consumerFromContract.totalEnergyConsumed;
  entity.isElectricitySupply=consumerFromContract.isElectricitySupply;
  entity.payableAmountForElectricity = consumerFromContract.payableAmountForEnergy;
  entity.startCycleTime = consumerFromContract.startCycleTime;
  entity.endCycleTime=consumerFromContract.endCycleTime;
  entity.isLastElectricityBillPaid = consumerFromContract.isLastElectricityBillPaid;
  entity.energyConsumedIncurrentCycle = consumerFromContract.energyConsumedInCurrentCycle;
  entity.addedAt = event.block.timestamp;
  entity.totalEnergyBought = consumerFromContract.totalEnergyConsumed;
  entity.save();
}

export function  handleConsumerConnectedToDistributor(
  event: ConsumerConnectedToDistributor
): void {
  const consumerId = event.params.consumerId;
  const distributorId = event.params.distributorId
  const prevdistributorId = event.params.prevDistributorId
  const consumer = Consumer.load(`Consumer-${consumerId}`)
  if(consumer){
    // update the disttributor connected to consumer to a new one
    consumer.distributor = `Distributor-${distributorId}`
    consumer.startCycleTime=event.block.timestamp
    consumer.isElectricitySupply=true;
    //TODO: uncomment this later after testing
    consumer.endCycleTime = event.block.timestamp
    // consumer.endCycleTime=event.block.timestamp+30
    // now we check if there already exists a previous substation connected to distributor -> if yes remove the distributor from that substation
    const prevDistributor = Distributor.load(`Distributor-${prevdistributorId}`)
    if(prevDistributor){
      const prevDistributorConsumers = prevDistributor.consumers
      if(prevDistributorConsumers){
          const index = prevDistributorConsumers.indexOf(consumer.id)
          prevDistributorConsumers.splice(index,1)
          prevDistributor.consumers = prevDistributorConsumers
          prevDistributor.save()   
      }
    }
    const newDistributor = Distributor.load(`Distributor-${distributorId}`)
    if(newDistributor){
      let newConsumers = newDistributor.consumers
      if(!newConsumers){
        newConsumers = new Array<string>();
      }
      newConsumers.push(consumer.id)
      newDistributor.consumers=newConsumers
      newDistributor.save()
    }
    consumer.save()
  }
}


export function handleUpdateUnitsConsumedRan(
  event: UpdateUnitsConsumedRan
): void {
  const today = event.params.day;
  const stringDate = new Date(today.toU64() * 86400 * 1000)
    .toISOString()
    .split("T")[0];
  let contract = EnergySupplyChain.bind(event.address);
  let distributorIdsArray = contract.getDistributors();
  for (let i = 0; i < distributorIdsArray.length; i++) {
    const distributorFromContract = contract.getDistributorById(
      distributorIdsArray[i]
    );
    const dailyEnergyAmount =contract.distributorsDailyEnergySoldById(distributorIdsArray[i],event.params.day)
    const distributor = Distributor.load(
      `Distributor-${distributorIdsArray[i]}`
    );
    if (distributor) {
      distributor.energyAvailableToBuy =
        distributorFromContract.energyAvailable;
      distributor.totalEnergySold = distributorFromContract.totalEnergySold;
      distributor.isElectricitySupply = distributorFromContract.isEnergySupply;
      distributor.toShowLessEnergyWarning = distributorFromContract.isLessEnergyWarning;
      let dailyEnergySold = DailyEnergy.load(
        `Distributor-${distributorIdsArray[i]}-${stringDate}-Sold`
      );
      if (!dailyEnergySold) {
        dailyEnergySold = new DailyEnergy(
          `Distributor-${distributorIdsArray[i]}-${stringDate}-Sold`
          );
        }
        dailyEnergySold.amount = dailyEnergyAmount
        dailyEnergySold.timestamp = event.block.timestamp;
        dailyEnergySold.date = stringDate;
        dailyEnergySold.type = "Distributor";
        dailyEnergySold.address = distributorFromContract.distributorAddress;
        dailyEnergySold.userId = distributorIdsArray[i];
        dailyEnergySold.actionType = "Sold";
        dailyEnergySold.save();
        let energiesSold = distributor.energiesSoldByDate;
        if (!energiesSold) {
          energiesSold = new Array<string>();
        }
        energiesSold.push(dailyEnergySold.id);
        distributor.energiesSoldByDate = energiesSold;
      
      distributor.save();

      for(let j=0;j<distributorFromContract.consumerIds.length;j++){
        const consumerTicker = distributorFromContract.consumerIds[j];
        const consumerFromContract = contract.getConsumerById(consumerTicker)
        const consumer = Consumer.load(`Consumer-${consumerTicker}`)
        if(consumer){
          consumer.isLastElectricityBillPaid = consumerFromContract.isLastElectricityBillPaid
          consumer.totalEnergyBought = consumerFromContract.totalEnergyConsumed
          consumer.energyConsumedIncurrentCycle = consumerFromContract.energyConsumedInCurrentCycle

          let dailyEnergyOfConsumer = DailyEnergy.load(`Consumer-${consumerTicker}-${stringDate}-Bought`)
          if(!dailyEnergyOfConsumer){
            dailyEnergyOfConsumer = new DailyEnergy(`Consumer-${consumerTicker}-${stringDate}-Bought`)
            dailyEnergyOfConsumer.amount = BigInt.zero()
          }
         
          dailyEnergyOfConsumer.amount =  dailyEnergyOfConsumer.amount.plus(BigInt.fromI32(1))
          
        // dailyEnergyOfConsumer.amount =dailyEnergyOfConsumer.amount.isZero() ?BigInt.fromI32(1):  dailyEnergyOfConsumer.amount.plus(BigInt.fromI32(1))
        dailyEnergyOfConsumer.date = stringDate;
        dailyEnergyOfConsumer.type = "Consumer";
        dailyEnergyOfConsumer.address = consumerFromContract.consumerAddress;
        dailyEnergyOfConsumer.userId = consumerTicker;
        dailyEnergyOfConsumer.actionType = "Bought";
        dailyEnergyOfConsumer.timestamp = event.block.timestamp
        dailyEnergyOfConsumer.save();
        let energiesBoughtConsumer = consumer.energiesBoughtByDate;
        if (!energiesBoughtConsumer) {
          energiesBoughtConsumer = new Array<string>();
        }
        energiesBoughtConsumer.push(dailyEnergyOfConsumer.id);
        consumer.energiesBoughtByDate = energiesBoughtConsumer;
      
      consumer.save();

        }
      }
    }

    
  }
}

export function handleElectricityPaidByConsumer(
  event: ElectricityPaidByConsumer
): void {
  const consumerId = event.params.consumerId
  const energyConsumed = event.params.energyConsumed
  const startTime = event.params.startTime
  const endTime = event.params.endTime
  const stringDate = new Date(event.block.timestamp.toU64() * 86400 * 1000)
.toISOString()
.split("T")[0];

  const consumer = Consumer.load(`Consumer-${consumerId}`)
  if(consumer){
    consumer.startCycleTime = event.block.timestamp
    consumer.endCycleTime = event.block.timestamp
    // TODO:uncomment this later
    // consumer.endCycleTime = event.block.timestamp + 30 days;
    consumer.energyConsumedIncurrentCycle=BigInt.zero();
    consumer.isElectricitySupply=true;
    consumer.isLastElectricityBillPaid=true;

    const consumerPayment = new ConsumerPayment(`Consumer-${consumerId}-${event.block.timestamp}`)
    consumerPayment.startTime = startTime;
    consumerPayment.endTime=endTime;
    consumerPayment.unitsConsumed=energyConsumed
    consumerPayment.consumer = consumer.id;
    consumerPayment.date = stringDate;
    consumerPayment.save()

    let consumerPayments = consumer.payments
    if(!consumerPayments){
      consumerPayments = new Array<string>()
    }
    consumerPayments.push(consumerPayment.id)
    consumer.payments=consumerPayments
    consumer.save()
  }
}

export function handleConsumerCancelledElectricity(event:ConsumerCancelledElectricity):void{
const consumerTicker  = event.params.consumerTicker
const prevDistributorTicker = event.params.distributorTicker;
const unitsConsumed = event.params.energyConsumed
const startTime = event.params.startTime
const today = event.params.today
const stringDate = new Date(today.toU64() * 86400 * 1000)
.toISOString()
.split("T")[0];

const consumer = Consumer.load(`Consumer-${consumerTicker}`)

if(consumer){
  let payment =new  ConsumerPayment(`Consumer-${consumerTicker}-${event.block.timestamp}`)
  payment.startTime = startTime;
  payment.endTime=event.block.timestamp;
  payment.unitsConsumed=unitsConsumed
  payment.consumer = consumer.id;
  payment.date = stringDate;
  payment.save()


  consumer.distributor=null;
  consumer.energyConsumedIncurrentCycle=BigInt.zero();
  consumer.startCycleTime=BigInt.zero();
  consumer.endCycleTime=BigInt.zero();
  consumer.isElectricitySupply=false;
  consumer.isLastElectricityBillPaid=true;
  let consumerPayments = consumer.payments;
  if(!consumerPayments){
      consumerPayments = new Array<string>()
  }
  consumerPayments.push(payment.id)
  consumer.payments = consumerPayments
  consumer.save()
}

// remove consumer from distributor entity
let distributor = Distributor.load(`Distributor-${prevDistributorTicker}`)
if(distributor){
  const prevDistributorConsumers = distributor.consumers
  if(prevDistributorConsumers){
      const index = prevDistributorConsumers.indexOf(`Consumer-${consumerTicker}`)
      prevDistributorConsumers.splice(index,1)
      distributor.consumers = prevDistributorConsumers
      distributor.save()   
  }
}

}