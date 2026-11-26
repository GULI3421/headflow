export type HeatingSource = "none" | "gas" | "electric" | "solidFuel";
export type InsulationLevel = "poor" | "standard" | "high";
export type DeliveryMode = "none" | "bishkek" | "region";

export type HeatingEstimateInput = {
  area: number;
  windows: number;
  ceilingHeight: number;
  insulation: InsulationLevel;
  heatingSource: HeatingSource;
  includeChimney: boolean;
  includeUnderfloor: boolean;
  deliveryMode: DeliveryMode;
  includeInstallation: boolean;
};

const prices = {
  radiatorSection: 1200,
  pipeMeter: 90,
  ballValve: 350,
  bracket: 80,
  airVent: 150,
  fittingsAndInsulationPerPipeMeter: 85,
  mountingConsumablesPerRadiator: 250,
  boilerPerKilowatt: {
    gas: 1800,
    electric: 1300,
    solidFuel: 2600,
  },
  boilerInstallation: {
    gas: 10000,
    electric: 6000,
    solidFuel: 12000,
  },
  gasChimney: 18000,
  solidFuelChimney: 28000,
  underfloorPipePerMeter: 110,
  underfloorCollector: 18000,
  underfloorInstallationPerSquareMeter: 550,
  bishkekDelivery: 1200,
  regionalDelivery: 3500,
  installationPerSquareMeter: 450,
  installationPerRadiator: 800,
};

export const insulationMultipliers: Record<InsulationLevel, number> = {
  poor: 1.2,
  standard: 1,
  high: 0.8,
};

const standardBoilerPowers = [6, 9, 12, 15, 18, 24, 28, 30, 35, 40, 50, 60, 80, 100, 120];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function selectBoilerPower(requiredKilowatts: number) {
  return standardBoilerPowers.find((power) => power >= requiredKilowatts)
    ?? Math.ceil(requiredKilowatts / 10) * 10;
}

export function calculateHeatingEstimate(input: HeatingEstimateInput) {
  const area = clamp(input.area, 1, 5000);
  const windows = Math.round(clamp(input.windows, 1, 100));
  const ceilingHeight = clamp(input.ceilingHeight, 2, 6);
  const ceilingMultiplier = ceilingHeight / 2.8;
  const insulationMultiplier = insulationMultipliers[input.insulation];
  const heatLossWatts = Math.ceil(area * 100 * ceilingMultiplier * insulationMultiplier);
  const requiredBoilerKilowatts = (heatLossWatts * 1.15) / 1000;
  const recommendedBoilerKilowatts = selectBoilerPower(requiredBoilerKilowatts);
  const totalSections = Math.ceil(heatLossWatts / 150);
  const sectionsPerRadiator = Math.ceil(totalSections / windows);
  const pipeMeters = Math.ceil(area * 2.5);
  const underfloorPipeMeters = input.includeUnderfloor ? Math.ceil(area * 5) : 0;
  const ballValves = windows * 2;
  const brackets = windows * 4;
  const airVents = windows;

  const boilerCost = input.heatingSource === "none"
    ? 0
    : recommendedBoilerKilowatts * prices.boilerPerKilowatt[input.heatingSource];
  const radiatorsCost = totalSections * prices.radiatorSection;
  const pipesCost = pipeMeters * prices.pipeMeter;
  const accessoriesCost =
    ballValves * prices.ballValve
    + brackets * prices.bracket
    + airVents * prices.airVent
    + pipeMeters * prices.fittingsAndInsulationPerPipeMeter
    + windows * prices.mountingConsumablesPerRadiator;
  const chimneyCost = input.includeChimney
    ? input.heatingSource === "gas"
      ? prices.gasChimney
      : input.heatingSource === "solidFuel" ? prices.solidFuelChimney : 0
    : 0;
  const underfloorCost = input.includeUnderfloor
    ? underfloorPipeMeters * prices.underfloorPipePerMeter + prices.underfloorCollector
    : 0;
  const deliveryCost = input.deliveryMode === "bishkek"
    ? prices.bishkekDelivery
    : input.deliveryMode === "region" ? prices.regionalDelivery : 0;
  const extrasCost = chimneyCost + underfloorCost + deliveryCost;
  const installationCost = input.includeInstallation
    ? area * prices.installationPerSquareMeter
      + windows * prices.installationPerRadiator
      + (input.heatingSource === "none" ? 0 : prices.boilerInstallation[input.heatingSource])
      + (input.includeUnderfloor ? area * prices.underfloorInstallationPerSquareMeter : 0)
    : 0;

  return {
    area,
    windows,
    ceilingHeight,
    ceilingMultiplier,
    insulationMultiplier,
    heatLossWatts,
    requiredBoilerKilowatts,
    recommendedBoilerKilowatts,
    totalSections,
    sectionsPerRadiator,
    pipeMeters,
    underfloorPipeMeters,
    ballValves,
    brackets,
    airVents,
    boilerCost,
    radiatorsCost,
    pipesCost,
    accessoriesCost,
    chimneyCost,
    underfloorCost,
    deliveryCost,
    extrasCost,
    installationCost,
    grandTotal: boilerCost + radiatorsCost + pipesCost + accessoriesCost + extrasCost + installationCost,
  };
}
