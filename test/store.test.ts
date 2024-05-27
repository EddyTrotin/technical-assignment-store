import { JSONObject } from "../src/json-types";
import { Permission, Restrict, Store } from "../src/store";
import { UserStore } from "../src/userStore";
import { AdminStore } from "./../src/adminStore";
import { lazy } from "../src/lazy";

/*

1. Basic Read/Write Operations

These tests check the fundamental operations for user and admin stores.

*/

describe("UserStore class - Basic Operations", () => {
  let userStore: UserStore;

  beforeEach(() => {
    userStore = new UserStore();
  });

  it("should read non existing keys", () => {
    expect(userStore.read("nonExistingKey")).toBe(undefined);
  });

  it("should read allowed keys", () => {
    expect(userStore.read("name")).toBe("John Doe");
  });

  it("should write non existing keys", () => {
    userStore.write("nonExistingKey", "John Doe");
    expect(userStore.read("nonExistingKey")).toBe("John Doe");
  });

  it("should write allowed keys", () => {
    userStore.write("name", "Jhone Known");
    expect(userStore.read("name")).toBe("Jhone Known");
  });

  it("should allow reading non existing keys", () => {
    expect(userStore.allowedToRead("nonExistingKey")).toBe(true);
  });

  it("should allow reading allowed keys", () => {
    expect(userStore.allowedToRead("name")).toBe(true);
  });

  it("should allow writing non existing keys", () => {
    expect(userStore.allowedToWrite("nonExistingKey")).toBe(true);
  });

  it("should allow writing allowed keys", () => {
    expect(userStore.allowedToWrite("nonExistingKey")).toBe(true);
  });
});

/*

2. Inheritance and Permissions

These tests verify the permission controls and the inheritance properties in the admin store, including reading and writing permissions.

*/

describe("AdminStore class - Inheritance and Permissions", () => {
  let adminStore: AdminStore;

  beforeEach(() => {
    const userStore = new UserStore();
    adminStore = new AdminStore(userStore);
  });

  it("should throw when reading disallowed key", () => {
    expect(() => adminStore.read("name")).toThrow(Error);
  });

  it("should throw when reading non existing key", () => {
    expect(() => adminStore.read("nonExistingKey")).toThrow(Error);
  });

  it("should throw when writing disallowed key", () => {
    expect(() => adminStore.write("name", "John Smith")).toThrow(Error);
  });

  it("should throw when writing non existing key", () => {
    expect(() => adminStore.write("nonExistingKey", "John Smith")).toThrow(Error);
  });

  it("should not allow reading disallowed key", () => {
    expect(adminStore.allowedToRead("name")).toBe(false);
  });

  it("should not allow reading non existing keys", () => {
    expect(adminStore.allowedToRead("nonExistingKey")).toBe(false);
  });

  it("should not allow writing disallowed keys", () => {
    expect(adminStore.allowedToWrite("name")).toBe(false);
  });

  it("should not allow writing non existing keys", () => {
    expect(adminStore.allowedToWrite("nonExistingKey")).toBe(false);
  });
});

/*

3. Nested Store Operations

Tests for both user and admin stores, focusing on nested store operations.

*/

describe("Nested Store Operations", () => {
  let userStore: UserStore;
  let adminStore: AdminStore;

  beforeEach(() => {
    userStore = new UserStore();
    adminStore = new AdminStore(userStore);
  });

  it("should allow writing nested keys in user store", () => {
    expect(userStore.write("profile:name", "John Smith")).toBe("John Smith");
  });

  it("should allow reading nested keys in user store", () => {
    userStore.write("profile:name", "John Smith");
    expect(userStore.read("profile:name")).toBe("John Smith");
  });

  it("should allow reading nested keys in admin store", () => {
    expect(adminStore.read("user:name")).toBe("John Doe");
  });

  it("should allow writing nested keys in user from admin store", () => {
    expect(adminStore.write("user:profile:name", "John Smith")).toBe("John Smith");
  });

  it("should allow reading nested keys in user from admin store", () => {
    adminStore.write("user:profile:name", "John Smith");
    expect(adminStore.read("user:profile:name")).toBe("John Smith");
  });

  it("should disallow writing nested keys in admin store", () => {
    expect(() => adminStore.write("profile:name", "John Smith")).toThrow(Error);
  });

  it("should disallow reading nested keys in admin store", () => {
    expect(() => adminStore.read("profile:name")).toThrow(Error);
  });

  it("should write multiple entries to the store", () => {
    const store = new Store();
    const entries: JSONObject = { a: "value1", b: { c: "value2" } };
    store.writeEntries(entries);
    expect(store.read("a")).toBe("value1");
    expect(store.read("b:c")).toBe("value2");
  });

  it("should be able to loop on a store", () => {
    const store = new Store();
    const entries: JSONObject = { value: "value", store: { value: "value" } };
    store.write("deep", entries);
    const cStore = store.read("deep:store") as Store;
    const entries2: JSONObject = { value: "value", store: { value: "value2" } };
    cStore.write("deep", entries2);
    expect(store.read("deep:store:value")).toBe("value");
    expect(store.read("deep:store:deep:store:value")).toBe("value2");
  });
});

/*

4. Function Read Operations

This tests the ability of the AdminStore class to read from a function result.

*/

describe("AdminStore class - Function Read", () => {
  let adminStore: AdminStore;

  beforeEach(() => {
    const userStore = new UserStore();
    adminStore = new AdminStore(userStore);
  });

  it("should be allowed to read from a function result", () => {
    expect(adminStore.read("getCredentials:username")).toBe("user1");
  });
});

/*

5. Restricted Store Operations

These tests validate the behavior of a restricted store, ensuring that restricted keys can't be read or written.

*/

describe("Restricted Store", () => {
  let store: Store;

  beforeEach(() => {
    store = new Store();
    store.defaultPolicy = "none"; // Restrict all keys
  });

  it("should not write over restricted key", () => {
    expect(() => {
      return store.write("restrictedKey", "testValue");
    }).toThrow(Error);
  });

  it("should not read restricted key", () => {
    expect(() => {
      return store.read("restrictedKey");
    }).toThrow(Error);
  });

  it("should not write over nested restricted key", () => {
    expect(() => {
      return store.write("nested:restrictedKey", "testValue");
    }).toThrow(Error);
  });

  it("should not read nested restricted key", () => {
    expect(() => {
      return store.read("nested:restrictedKey");
    }).toThrow(Error);
  });
});

/*

6. Test Store Decorators

These tests ensure that decorators work as expected, especially when it comes to restricted properties.

*/

describe("Test Store - Decorators", () => {
  it("should not write over restricted property", () => {
    class TestStore extends Store {
      @Restrict("none")
      public restrictedProp?: string;
    }
    const testStore = new TestStore();
    expect(() => {
      testStore.write("restrictedProp", "new value");
    }).toThrow(Error);
  });

  it("should list readable properties", () => {
    class TestStore extends Store {
      @Restrict("r")
      public readableProperty = "test";
    }
    const testStore = new TestStore();
    expect(testStore.entries()).toHaveProperty("readableProperty", "test");
  });

  it("should hide restricted properties", () => {
    class TestStore extends Store {
      @Restrict("none")
      public restrictedProp = "test";
    }
    const testStore = new TestStore();
    expect(testStore.entries()).not.toHaveProperty("restrictedProp");
  });
});

/*

7. Test Default Policy Behavior

These tests ensure that default policies are correctly applied to keys with no explicit permissions set.

*/

describe("Test Store - Default Policy Behavior", () => {
  it("should disallow writing a key with default read permission", () => {
    class TestStore extends Store {
      public defaultPolicy: Permission = "r";
      public defaultRestrictedProp?: string;
    }
    const testStore = new TestStore();
    expect(() => {
      testStore.write("defaultRestrictedProp", "testValue");
    }).toThrow(Error);
  });

  it("should allow writing a key with no explicit permissions", () => {
    class TestStore extends Store {
      public defaultNonRestrictedProp?: string;
    }
    const testStore = new TestStore();
    testStore.write("defaultNonRestrictedProp", "testValue");
    expect(testStore.read("defaultNonRestrictedProp")).toBe("testValue");
  });
});

/*

8. Test Multiple Levels of Nested Keys

These tests ensure that the system can correctly handle multi-level nested keys.

*/

describe("Test Store - Multiple Levels of Nested Keys", () => {
  it("should allow writing multi-level nested keys", () => {
    const store = new Store();
    expect(store.write("level1:level2:level3", "testValue")).toBe("testValue");
  });

  it("should allow reading multi-level nested keys", () => {
    const store = new Store();
    store.write("level1:level2:level3", "testValue");
    expect(store.read("level1:level2:level3")).toBe("testValue");
  });
});

/*

9. Test Behavior when the Same Key is Used Multiple Times

These tests verify the behavior of the system when keys are overwritten or permissions are changed.

*/

describe("Test Store - Behavior when Same Key is Used Multiple Times", () => {
  it("should overwrite key with new value", () => {
    const store = new Store();
    store.defaultPolicy = "rw";
    store.write("key", "value1");
    store.write("key", "value2");
    expect(store.read("key")).toBe("value2");
  });

  it("should update key permissions", () => {
    class TestStore extends Store {
      @Restrict("rw")
      public prop?: string;
    }
    const testStore = new TestStore();
    testStore.write("prop", "value1");
    expect(testStore.allowedToRead("prop")).toBe(true);
    expect(testStore.allowedToWrite("prop")).toBe(true);

    // Change permissions
    Restrict("r")(testStore, "prop");

    expect(testStore.allowedToRead("prop")).toBe(true);
    expect(testStore.allowedToWrite("prop")).toBe(false);
  });
});

/*

10. Test Permission Inheritance

These tests verify that nested keys correctly inherit permissions from their parent keys.

*/

describe("Test Store - Permission Inheritance", () => {
  it("should pass key permission to children stores", () => {
    class ParentStore extends Store {
      @Restrict("r")
      public parentProp = lazy(() => new ChildStore());
    }
    class ChildStore extends ParentStore { }
    const baseChildStore = new ChildStore();
    const nestedChildStore = baseChildStore.read(
      "parentProp:parentProp:parentProp"
    ) as Store;
    expect(nestedChildStore).toBeInstanceOf(ChildStore);
    expect(baseChildStore.allowedToRead("parentProp")).toBe(true);
    expect(nestedChildStore.allowedToRead("parentProp")).toBe(true);
    expect(baseChildStore.allowedToWrite("parentProp")).toBe(false);
    expect(nestedChildStore.allowedToWrite("parentProp")).toBe(false);
  });
});
