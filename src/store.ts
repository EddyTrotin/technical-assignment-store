import "reflect-metadata";
import { JSONArray, JSONObject, JSONPrimitive } from "./json-types";

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
    if (!this.allowedToRead(path)) throw new Error('READ_NOT_ALLOWED')
    return (this as any)[path];
  }

  write(path: string, value: StoreValue): StoreValue {
    (this as any)[path] = value;
    return value;
  }

  writeEntries(entries: JSONObject): void {
    throw new Error("Method not implemented.");
  }

  entries(): JSONObject {
    throw new Error("Method not implemented.");
  }
}
