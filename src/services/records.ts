import AsyncStorage from '@react-native-async-storage/async-storage';
import { FuelEntry, ServiceEntry, BlacklistItem } from '../types';

const STORAGE_KEY_FUEL = '@carlogix_fuel_entries';
const STORAGE_KEY_SERVICE = '@carlogix_service_entries';
const STORAGE_KEY_BLACKLIST = '@carlogix_blacklist_entries';

export class FuelService {
  /**
   * Získá všechny záznamy o tankování seřazené od nejnovějšího.
   */
  public static async getEntries(): Promise<FuelEntry[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY_FUEL);
      if (!data) return [];
      const list: FuelEntry[] = JSON.parse(data);
      return list;
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
      id: 'fuel-' + Date.now(),
    };
    const updated = [newEntry, ...list];
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
}

export class ServiceBookService {
  /**
   * Získá všechny servisní záznamy.
   */
  public static async getEntries(): Promise<ServiceEntry[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY_SERVICE);
      if (!data) return [];
      const list: ServiceEntry[] = JSON.parse(data);
      return list;
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
      id: 'service-' + Date.now(),
    };
    const updated = [newEntry, ...list];
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
   * Získá všechny díly na blacklistu.
   */
  public static async getBlacklist(): Promise<BlacklistItem[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY_BLACKLIST);
      if (!data) return [];
      const list: BlacklistItem[] = JSON.parse(data);
      return list;
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
      id: 'bl-' + Date.now(),
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
}
