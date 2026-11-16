import AsyncStorage from '@react-native-async-storage/async-storage';
import { FuelEntry, ServiceEntry, BlacklistItem } from '../types';
import { czechDateToIso } from '../components/DateFormattedInput';

const STORAGE_KEY_FUEL = '@carlogix_fuel_entries';
const STORAGE_KEY_SERVICE = '@carlogix_service_entries';
const STORAGE_KEY_BLACKLIST = '@carlogix_blacklist_entries';

function createRecordId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function sortByDateAndOdometerDesc<T extends { date: string; odometer: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const isoA = czechDateToIso(a.date) || '';
    const isoB = czechDateToIso(b.date) || '';
    if (isoA !== isoB) {
      return isoB.localeCompare(isoA);
    }
    return b.odometer - a.odometer;
  });
}

/**
 * Bezpečně parsuje nezáporné desetinné číslo (čárka i tečka, volitelné mezery).
 * Vrací null pro neplatný nebo záporný vstup.
 */
export function parseStrictDecimal(raw: string, allowZero: boolean = false): number | null {
  const normalized = raw.trim().replace(/\s+/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  if (!allowZero && value <= 0) return null;
  return value;
}

export interface FuelMetrics {
  avgConsumption: number | null;
  costPerKm: number | null;
  avgPricePerLiter: number;
  fullTankCount: number;
  perEntryConsumption: Record<string, number>;
}

/**
 * Výpočet průměrné spotřeby a nákladu na 1 km metodou plná–plná.
 */
export function calculateFuelMetrics(entries: FuelEntry[]): FuelMetrics {
  if (entries.length === 0) {
    return {
      avgConsumption: null,
      costPerKm: null,
      avgPricePerLiter: 0,
      fullTankCount: 0,
      perEntryConsumption: {},
    };
  }

  const totalSpent = entries.reduce((acc, curr) => acc + curr.priceTotalCzK, 0);
  const totalLiters = entries.reduce((acc, curr) => acc + curr.liters, 0);
  const avgPricePerLiter = totalLiters > 0 ? totalSpent / totalLiters : 0;

  // Seřadit vzestupně podle tachometru (při shodě podle data vzestupně)
  const sortedAsc = [...entries].sort((a, b) => {
    if (a.odometer !== b.odometer) return a.odometer - b.odometer;
    const isoA = czechDateToIso(a.date) || '';
    const isoB = czechDateToIso(b.date) || '';
    return isoA.localeCompare(isoB);
  });

  const fullIndices: number[] = [];
  sortedAsc.forEach((entry, idx) => {
    if (entry.isFullTank) {
      fullIndices.push(idx);
    }
  });

  const perEntryConsumption: Record<string, number> = {};
  for (let i = 1; i < fullIndices.length; i++) {
    const prevIdx = fullIndices[i - 1];
    const currIdx = fullIndices[i];
    const segmentDistance = sortedAsc[currIdx].odometer - sortedAsc[prevIdx].odometer;
    if (segmentDistance > 0) {
      let segmentLiters = 0;
      for (let j = prevIdx + 1; j <= currIdx; j++) {
        segmentLiters += sortedAsc[j].liters;
      }
      perEntryConsumption[sortedAsc[currIdx].id] = (segmentLiters / segmentDistance) * 100;
    }
  }

  let avgConsumption: number | null = null;
  let costPerKm: number | null = null;

  if (fullIndices.length >= 2) {
    const firstFullIdx = fullIndices[0];
    const lastFullIdx = fullIndices[fullIndices.length - 1];
    const totalDistance = sortedAsc[lastFullIdx].odometer - sortedAsc[firstFullIdx].odometer;

    if (totalDistance > 0) {
      let intervalLiters = 0;
      let intervalCost = 0;
      for (let j = firstFullIdx + 1; j <= lastFullIdx; j++) {
        intervalLiters += sortedAsc[j].liters;
        intervalCost += sortedAsc[j].priceTotalCzK;
      }
      avgConsumption = (intervalLiters / totalDistance) * 100;
      costPerKm = intervalCost / totalDistance;
    }
  }

  return {
    avgConsumption,
    costPerKm,
    avgPricePerLiter,
    fullTankCount: fullIndices.length,
    perEntryConsumption,
  };
}

export class FuelService {
  /**
   * Získá záznamy o tankování seřazené od nejnovějšího (volitelně filtrované podle vozidla).
   */
  public static async getEntries(vehicleId?: string): Promise<FuelEntry[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY_FUEL);
      if (!data) return [];
      const list: FuelEntry[] = JSON.parse(data);
      const filtered = vehicleId ? list.filter((e) => e.vehicleId === vehicleId) : list;
      return sortByDateAndOdometerDesc(filtered);
    } catch (e) {
      console.error('Chyba při načítání tankování:', e);
      return [];
    }
  }

  /**
   * Uloží nový záznam o tankování.
   */
  public static async addEntry(entry: Omit<FuelEntry, 'id'>): Promise<FuelEntry> {
    const list = await this.getEntries();
    const newEntry: FuelEntry = {
      ...entry,
      id: createRecordId('fuel'),
    };
    const updated = sortByDateAndOdometerDesc([newEntry, ...list]);
    await AsyncStorage.setItem(STORAGE_KEY_FUEL, JSON.stringify(updated));
    return newEntry;
  }

  /**
   * Smaže záznam o tankování podle ID.
   */
  public static async deleteEntry(id: string): Promise<boolean> {
    try {
      const list = await this.getEntries();
      const updated = list.filter((e) => e.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY_FUEL, JSON.stringify(updated));
      return true;
    } catch (e) {
      console.error('Chyba při mazání tankování:', e);
      return false;
    }
  }

  /**
   * Smaže všechny záznamy o tankování pro dané vozidlo.
   */
  public static async deleteByVehicleId(vehicleId: string): Promise<void> {
    try {
      const list = await this.getEntries();
      const updated = list.filter((e) => e.vehicleId !== vehicleId);
      await AsyncStorage.setItem(STORAGE_KEY_FUEL, JSON.stringify(updated));
    } catch (e) {
      console.error('Chyba při mazání tankování vozidla:', e);
    }
  }
}

export class ServiceBookService {
  /**
   * Získá servisní záznamy seřazené od nejnovějšího (volitelně filtrované podle vozidla).
   */
  public static async getEntries(vehicleId?: string): Promise<ServiceEntry[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY_SERVICE);
      if (!data) return [];
      const list: ServiceEntry[] = JSON.parse(data);
      const filtered = vehicleId ? list.filter((e) => e.vehicleId === vehicleId) : list;
      return sortByDateAndOdometerDesc(filtered);
    } catch (e) {
      console.error('Chyba při načítání servisní knihy:', e);
      return [];
    }
  }

  /**
   * Uloží nový servisní úkon.
   */
  public static async addEntry(entry: Omit<ServiceEntry, 'id'>): Promise<ServiceEntry> {
    const list = await this.getEntries();
    const newEntry: ServiceEntry = {
      ...entry,
      id: createRecordId('service'),
    };
    const updated = sortByDateAndOdometerDesc([newEntry, ...list]);
    await AsyncStorage.setItem(STORAGE_KEY_SERVICE, JSON.stringify(updated));
    return newEntry;
  }

  /**
   * Smaže servisní záznam.
   */
  public static async deleteEntry(id: string): Promise<boolean> {
    try {
      const list = await this.getEntries();
      const updated = list.filter((e) => e.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY_SERVICE, JSON.stringify(updated));
      return true;
    } catch (e) {
      console.error('Chyba při mazání servisního záznamu:', e);
      return false;
    }
  }

  /**
   * Získá díly na blacklistu (volitelně filtrované podle vozidla).
   */
  public static async getBlacklist(vehicleId?: string): Promise<BlacklistItem[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY_BLACKLIST);
      if (!data) return [];
      const list: BlacklistItem[] = JSON.parse(data);
      return vehicleId ? list.filter((b) => b.vehicleId === vehicleId) : list;
    } catch (e) {
      console.error('Chyba při načítání blacklistu:', e);
      return [];
    }
  }

  /**
   * Přidá díl na blacklist.
   */
  public static async addBlacklistItem(
    item: Omit<BlacklistItem, 'id' | 'createdAt'>
  ): Promise<BlacklistItem> {
    const list = await this.getBlacklist();
    const newItem: BlacklistItem = {
      ...item,
      id: createRecordId('bl'),
      createdAt: new Date().toISOString(),
    };
    const updated = [newItem, ...list];
    await AsyncStorage.setItem(STORAGE_KEY_BLACKLIST, JSON.stringify(updated));
    return newItem;
  }

  /**
   * Odstraní díl z blacklistu.
   */
  public static async deleteBlacklistItem(id: string): Promise<boolean> {
    try {
      const list = await this.getBlacklist();
      const updated = list.filter((b) => b.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY_BLACKLIST, JSON.stringify(updated));
      return true;
    } catch (e) {
      console.error('Chyba při mazání z blacklistu:', e);
      return false;
    }
  }

  /**
   * Smaže všechny servisní záznamy a blacklist položky pro dané vozidlo.
   */
  public static async deleteByVehicleId(vehicleId: string): Promise<void> {
    try {
      const [services, blacklist] = await Promise.all([
        this.getEntries(),
        this.getBlacklist(),
      ]);
      await Promise.all([
        AsyncStorage.setItem(
          STORAGE_KEY_SERVICE,
          JSON.stringify(services.filter((e) => e.vehicleId !== vehicleId))
        ),
        AsyncStorage.setItem(
          STORAGE_KEY_BLACKLIST,
          JSON.stringify(blacklist.filter((b) => b.vehicleId !== vehicleId))
        ),
      ]);
    } catch (e) {
      console.error('Chyba při mazání servisních dat vozidla:', e);
    }
  }
}
