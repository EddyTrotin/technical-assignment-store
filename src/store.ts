import "reflect-metadata";
import { JSONArray, JSONObject, JSONPrimitive, JSONValue } from "./json-types";

export type StoreResult = Store | JSONPrimitive | undefined;

export type StoreValue =
  | JSONObject
  | JSONArray
  | StoreResult
  | (() => StoreResult);

export interface IStore {
  defaultPolicy: Permission;
  allowedToRead(key: string): boolean;
  allowedToWrite(key: string): boolean;
  read(path: string): StoreResult;
  write(path: string, value: StoreValue): StoreValue;
  writeEntries(entries: JSONObject): void;
  entries(): JSONObject;
}

export type Permission = "r" | "w" | "rw" | "none";

export function Restrict(perm?: Permission): (target: IStore, propertyKey: string) => void {
  return function (target: IStore, propertyKey: string) {
    Reflect.defineMetadata("permission", perm, target, propertyKey);
  };
}

const primitives = ['string', 'number', 'boolean', 'null']
const isPrimitive = (x: any): boolean => primitives.includes(typeof x);

export class Store implements IStore {
  defaultPolicy: Permission = "rw";

  allowedToRead(key: string): boolean {
    const perm: string = Reflect.getMetadata("permission", this, key)
    return perm ? perm.includes('r') : this.defaultPolicy.includes('r')
  }

  allowedToWrite(key: string): boolean {
    const perm: string = Reflect.getMetadata("permission", this, key)
    return perm ? perm.includes('w') : this.defaultPolicy.includes('w')
  }

  read(path: string): StoreResult {
    const keys = path.split(':');
    const firstKey = keys.shift() as string;

    if (!this.allowedToRead(firstKey)) throw new Error('READ_NOT_ALLOWED');

    const data = (this as never)[firstKey] as Store;
    if (data instanceof Store) {
      return data.read(keys.join(':'));
    }

    if (path === '') return this;

    if (typeof data === 'function') {
      return (this as any)[firstKey]().read(keys.join(''))
    }

    return data;
  }

  write(path: string, value: StoreValue): StoreValue {
    const store = this as any;
    const keys = path.split(':');
    const firstKey = keys.shift() as string;
    const data = (this as never)[firstKey] as Store;

    if (data instanceof Store) {
      return data.write(keys.join(':'), value);
    }

    if (!this.allowedToWrite(firstKey)) throw new Error('WRITE_NOT_ALLOWED');

    if (data === undefined) {
      if (isPrimitive(value)) {
        store[firstKey] = value;
      } else {
        store[firstKey] = new Store();
        store[firstKey].writeEntries(value as JSONObject);
      }
    }

    if (isPrimitive(value)) {
      store[firstKey] = value;
    }

    return value;
  }

  writeEntries(entries: JSONObject): void {
    for (const [key, value] of Object.entries(entries)) {
      this.write(key, value);
    }
  }

  entries(): JSONObject {
    const entries: Record<string, JSONObject> = {}
    for (const [key, value] of Object.entries(this)) {
      if (key === 'defaultPolicy') continue;
      if (!this.allowedToRead(key)) continue;
      entries[key] = value
    }
    return entries
  }
}
