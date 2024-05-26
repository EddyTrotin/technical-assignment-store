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
const isPrimitive = (x: any): x is JSONPrimitive => primitives.includes(x);

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

    const data = (this as any)[firstKey];
    if (data instanceof Store) {
      return data.read(keys.join(':'));
    }
    let finalValue = data;
    if (keys.length > 0) {
      keys.forEach((key, index) => {
        finalValue = data[key];
      });
    }

    return finalValue
  }

  write(path: string, value: StoreValue): StoreValue {
    const store = this as any;

    const keys = path.split(':');
    const firstKey = keys.shift() as string;

    const data = store[firstKey];
    if (data instanceof Store) {
      return data.write(keys.join(':'), value);
    }

    if (!this.allowedToWrite(firstKey)) throw new Error('WRITE_NOT_ALLOWED');

    if (keys.length === 0) {
      store[firstKey] = value
    }
    else {
      const finalValue: Record<string, StoreValue> = {};
      keys.forEach((key, index) => {
        finalValue[key] = (keys.length - 1 === index) ? value : {}
      });
      store[firstKey] = finalValue;
    }

    return value;
  }

  writeEntries(entries: JSONObject): void {
    for (const [key, value] of Object.entries(entries)) {
      console.log(`${key}: ${value}`);
      this.write(key, value);
    }
  }

  entries(): JSONObject {
    throw new Error("Method not implemented.");
  }
}
