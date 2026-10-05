import { OBDLiveMetrics } from '../types';

export interface OBDConnectionStatus {
  isConnected: boolean;
  adapterName?: string;
  isSimulated: boolean;
}

/**
 * Service skeleton for managing OBD-II / BLE 4.0 adapter connections
 * and mock telemetry simulation for presentation/testing.
 */
export class OBDService {
  private static isSimulated: boolean = true;
  private static isConnected: boolean = false;

  public static getStatus(): OBDConnectionStatus {
    return {
      isConnected: this.isConnected,
      adapterName: this.isSimulated ? 'Mock Simulator (Peugeot 206)' : 'Vgate iCar Pro',
      isSimulated: this.isSimulated,
    };
  }

  public static setSimulationMode(enabled: boolean): void {
    this.isSimulated = enabled;
  }

  public static getMockMetrics(): OBDLiveMetrics {
    return this.getSimulatedMetrics();
  }

  /**
   * Generates realistic simulated telemetry for demonstration
   */
  public static getSimulatedMetrics(): OBDLiveMetrics {
    const randomRpmJitter = Math.floor(Math.random() * 80) - 40;
    const rpm = Math.max(800, 2200 + randomRpmJitter);
    const speed = Math.max(0, Math.floor(65 + Math.random() * 4));
    const coolantTemp = 89;
    const mafAirFlow = parseFloat((12.4 + (Math.random() * 0.8 - 0.4)).toFixed(1));
    const currentConsumptionLPer100Km = parseFloat((5.8 + (Math.random() * 0.4 - 0.2)).toFixed(1));

    return {
      rpm,
      speed,
      coolantTemp,
      mapPressure: 48,
      mafAirFlow,
      currentConsumptionLPer100Km,
      idleConsumptionLPerHour: 0.8,
    };
  }
}
