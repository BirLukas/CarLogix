import AsyncStorage from '@react-native-async-storage/async-storage';
import { FuelEntry, ServiceEntry, BlacklistItem } from '../types';
import { czechDateToIso, isoToCzechDate } from '../components/DateFormattedInput';
import { supabase, isSupabaseConfigured } from './supabase';
import { DocumentStorageService } from './documents';

const STORAGE_KEY_FUEL = '@carlogix_fuel_entries';
const STORAGE_KEY_SERVICE = '@carlogix_service_entries';
const STORAGE_KEY_BLACKLIST = '@carlogix_blacklist_entries';

function createRecordId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function getSupabaseUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
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
    const userId = await getSupabaseUserId();
    if (userId && vehicleId) {
      const { data, error } = await supabase
        .from('fuel_entries')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('date', { ascending: false })
        .order('odometer', { ascending: false });

      if (!error && data) {
        return data.map((row: any) => ({
          id: row.id,
          vehicleId: row.vehicle_id,
          userId: row.user_id,
          date: isoToCzechDate(row.date),
          odometer: row.odometer,
          liters: Number(row.liters),
          priceTotalCzK: Number(row.price_total_czk),
          pricePerLiter: Number(row.price_per_liter),
          isFullTank: Boolean(row.is_full_tank),
        }));
      }
      if (error) {
        console.warn('Chyba při načítání tankování ze Supabase:', error.message);
      }
    }

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
    const userId = await getSupabaseUserId();
    if (userId && entry.vehicleId) {
      const isoDate = czechDateToIso(entry.date);
      if (!isoDate) throw new Error('Neplatný formát data.');

      const { data, error } = await supabase
        .from('fuel_entries')
        .insert({
          vehicle_id: entry.vehicleId,
          user_id: userId,
          date: isoDate,
          odometer: entry.odometer,
          liters: entry.liters,
          price_total_czk: entry.priceTotalCzK,
          price_per_liter: entry.pricePerLiter,
          is_full_tank: entry.isFullTank,
        })
        .select('*')
        .single();

      if (!error && data) {
        return {
          id: data.id,
          vehicleId: data.vehicle_id,
          userId: data.user_id,
          date: isoToCzechDate(data.date),
          odometer: data.odometer,
          liters: Number(data.liters),
          priceTotalCzK: Number(data.price_total_czk),
          pricePerLiter: Number(data.price_per_liter),
          isFullTank: Boolean(data.is_full_tank),
        };
      }
      if (error) {
        throw new Error(error.message);
      }
    }

    const list = await this.getLocalEntries();
    const newEntry: FuelEntry = {
      ...entry,
      id: createRecordId('fuel'),
    };
    const updated = sortByDateAndOdometerDesc([newEntry, ...list]);
    await AsyncStorage.setItem(STORAGE_KEY_FUEL, JSON.stringify(updated));
    return newEntry;
  }

  private static async getLocalEntries(): Promise<FuelEntry[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEY_FUEL);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Smaže záznam o tankování podle ID.
   */
  public static async deleteEntry(id: string): Promise<boolean> {
    const userId = await getSupabaseUserId();
    if (userId && !id.startsWith('fuel-')) {
      const { error } = await supabase.from('fuel_entries').delete().eq('id', id);
      if (error) {
        console.error('Chyba při mazání tankování ze Supabase:', error.message);
        return false;
      }
      return true;
    }

    try {
      const list = await this.getLocalEntries();
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
      const list = await this.getLocalEntries();
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
    const userId = await getSupabaseUserId();
    if (userId && vehicleId) {
      const { data, error } = await supabase
        .from('service_entries')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('date', { ascending: false })
        .order('odometer', { ascending: false });

      if (!error && data) {
        return data.map((row: any) => ({
          id: row.id,
          vehicleId: row.vehicle_id,
          authorId: row.author_id,
          authorRole: row.author_role,
          workshopStamp: row.workshop_stamp || undefined,
          performer: row.performer || undefined,
          date: isoToCzechDate(row.date),
          odometer: row.odometer,
          title: row.title,
          description: row.description || undefined,
          partsSummary: row.parts_summary || undefined,
          materialPriceCzK: row.material_price_czk ?? 0,
          laborPriceCzK: row.labor_price_czk ?? 0,
          totalPriceCzK: row.total_price_czk ?? 0,
          invoiceImageUrl: row.invoice_image_url || undefined,
          isConfirmedByOwner: row.is_confirmed_by_owner ?? true,
        }));
      }
      if (error) {
        console.warn('Chyba při načítání servisní knihy ze Supabase:', error.message);
      }
    }

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
    const userId = await getSupabaseUserId();
    if (userId && entry.vehicleId) {
      const isoDate = czechDateToIso(entry.date);
      if (!isoDate) throw new Error('Neplatný formát data.');

      const { data, error } = await supabase
        .from('service_entries')
        .insert({
          vehicle_id: entry.vehicleId,
          author_id: userId,
          author_role: entry.authorRole || 'owner',
          workshop_stamp: entry.workshopStamp || null,
          performer: entry.performer || null,
          date: isoDate,
          odometer: entry.odometer,
          title: entry.title,
          description: entry.description || null,
          parts_summary: entry.partsSummary || null,
          material_price_czk: entry.materialPriceCzK ?? 0,
          labor_price_czk: entry.laborPriceCzK ?? 0,
          total_price_czk: entry.totalPriceCzK,
          invoice_image_url: entry.invoiceImageUrl || null,
          is_confirmed_by_owner: entry.isConfirmedByOwner ?? true,
        })
        .select('*')
        .single();

      if (!error && data) {
        return {
          id: data.id,
          vehicleId: data.vehicle_id,
          authorId: data.author_id,
          authorRole: data.author_role,
          workshopStamp: data.workshop_stamp || undefined,
          performer: data.performer || undefined,
          date: isoToCzechDate(data.date),
          odometer: data.odometer,
          title: data.title,
          description: data.description || undefined,
          partsSummary: data.parts_summary || undefined,
          materialPriceCzK: data.material_price_czk ?? 0,
          laborPriceCzK: data.labor_price_czk ?? 0,
          totalPriceCzK: data.total_price_czk ?? 0,
          invoiceImageUrl: data.invoice_image_url || undefined,
          isConfirmedByOwner: data.is_confirmed_by_owner ?? true,
        };
      }
      if (error) {
        throw new Error(error.message);
      }
    }

    const list = await this.getLocalEntries();
    const newEntry: ServiceEntry = {
      ...entry,
      id: createRecordId('service'),
    };
    const updated = sortByDateAndOdometerDesc([newEntry, ...list]);
    await AsyncStorage.setItem(STORAGE_KEY_SERVICE, JSON.stringify(updated));
    return newEntry;
  }

  private static async getLocalEntries(): Promise<ServiceEntry[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEY_SERVICE);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Smaže servisní záznam.
   */
  public static async deleteEntry(id: string, invoiceImageUrl?: string): Promise<boolean> {
    const userId = await getSupabaseUserId();
    if (userId && !id.startsWith('service-')) {
      const { error } = await supabase.from('service_entries').delete().eq('id', id);
      if (error) {
        console.error('Chyba při mazání servisního záznamu ze Supabase:', error.message);
        return false;
      }
      await DocumentStorageService.deleteImage(invoiceImageUrl);
      return true;
    }

    try {
      const list = await this.getLocalEntries();
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
    const userId = await getSupabaseUserId();
    if (userId && vehicleId) {
      const { data, error } = await supabase
        .from('blacklisted_parts')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((row: any) => ({
          id: row.id,
          vehicleId: row.vehicle_id,
          partName: row.part_name,
          brand: row.brand,
          partNumber: row.part_number || undefined,
          reason: row.reason,
          imageUrl: row.image_url || undefined,
          createdAt: row.created_at,
        }));
      }
      if (error) {
        console.warn('Chyba při načítání blacklistu ze Supabase:', error.message);
      }
    }

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
    const userId = await getSupabaseUserId();
    if (userId && item.vehicleId) {
      const { data, error } = await supabase
        .from('blacklisted_parts')
        .insert({
          vehicle_id: item.vehicleId,
          part_name: item.partName,
          brand: item.brand,
          part_number: item.partNumber || null,
          reason: item.reason,
          image_url: item.imageUrl || null,
        })
        .select('*')
        .single();

      if (!error && data) {
        return {
          id: data.id,
          vehicleId: data.vehicle_id,
          partName: data.part_name,
          brand: data.brand,
          partNumber: data.part_number || undefined,
          reason: data.reason,
          imageUrl: data.image_url || undefined,
          createdAt: data.created_at,
        };
      }
      if (error) {
        throw new Error(error.message);
      }
    }

    const list = await this.getLocalBlacklist();
    const newItem: BlacklistItem = {
      ...item,
      id: createRecordId('bl'),
      createdAt: new Date().toISOString(),
    };
    const updated = [newItem, ...list];
    await AsyncStorage.setItem(STORAGE_KEY_BLACKLIST, JSON.stringify(updated));
    return newItem;
  }

  private static async getLocalBlacklist(): Promise<BlacklistItem[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEY_BLACKLIST);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Odstraní díl z blacklistu.
   */
  public static async deleteBlacklistItem(id: string, imageUrl?: string): Promise<boolean> {
    const userId = await getSupabaseUserId();
    if (userId && !id.startsWith('bl-')) {
      const { error } = await supabase.from('blacklisted_parts').delete().eq('id', id);
      if (error) {
        console.error('Chyba při mazání z blacklistu ze Supabase:', error.message);
        return false;
      }
      await DocumentStorageService.deleteImage(imageUrl);
      return true;
    }

    try {
      const list = await this.getLocalBlacklist();
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
        this.getLocalEntries(),
        this.getLocalBlacklist(),
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
