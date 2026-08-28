function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function createWxMock() {
  const storage = new Map();
  const collections = {
    user_settings: [],
    period_records: [],
  };
  let writesFail = false;
  let readsFail = false;
  let functionError = null;
  let functionResult = { result: { success: true } };
  let id = 0;

  function query(collectionName, state = {}) {
    const rows = collections[collectionName];
    const chain = {
      where(filter) {
        return query(collectionName, { ...state, filter });
      },
      orderBy(field, direction) {
        return query(collectionName, { ...state, order: { field, direction } });
      },
      skip(offset) {
        return query(collectionName, { ...state, offset });
      },
      limit(limit) {
        return query(collectionName, { ...state, limit });
      },
      async get() {
        if (readsFail) throw new Error("cloud read failed");
        let data = rows.filter((item) =>
          !state.filter ||
          Object.entries(state.filter).every(([key, value]) => item[key] === value),
        );
        if (state.order) {
          const { field, direction } = state.order;
          data = [...data].sort((left, right) => {
            const result = String(left[field] || "").localeCompare(String(right[field] || ""));
            return direction === "desc" ? -result : result;
          });
        }
        const offset = state.offset || 0;
        data = data.slice(offset, state.limit === undefined ? undefined : offset + state.limit);
        return { data: clone(data) };
      },
      async add({ data }) {
        if (writesFail) throw new Error("cloud write failed");
        const saved = { ...clone(data), _id: `${collectionName}-${++id}` };
        rows.push(saved);
        return { _id: saved._id };
      },
      doc(documentId) {
        return {
          async update({ data }) {
            if (writesFail) throw new Error("cloud write failed");
            const index = rows.findIndex((item) => item._id === documentId);
            if (index >= 0) rows[index] = { ...rows[index], ...clone(data) };
            return { stats: { updated: index >= 0 ? 1 : 0 } };
          },
          async remove() {
            if (writesFail) throw new Error("cloud write failed");
            const index = rows.findIndex((item) => item._id === documentId);
            if (index >= 0) rows.splice(index, 1);
            return { stats: { removed: index >= 0 ? 1 : 0 } };
          },
        };
      },
    };
    return chain;
  }

  const wx = {
    getStorageSync(key) {
      return clone(storage.get(key));
    },
    setStorageSync(key, value) {
      storage.set(key, clone(value));
    },
    removeStorageSync(key) {
      storage.delete(key);
    },
    cloud: {
      database() {
        return {
          serverDate() {
            return { __serverDate: true };
          },
          collection(name) {
            return query(name);
          },
        };
      },
      async callFunction() {
        if (functionError) throw functionError;
        return clone(functionResult);
      },
    },
  };

  return {
    wx,
    failWrites(value) {
      writesFail = value;
    },
    failReads(value) {
      readsFail = value;
    },
    remoteRecords(records) {
      collections.period_records = records.map((item) => ({
        ...clone(item),
        _id: item._id || `period_records-${++id}`,
      }));
    },
    remoteSettings(settings) {
      collections.user_settings = settings.map((item) => ({
        ...clone(item),
        _id: item._id || `user_settings-${++id}`,
      }));
    },
    cloudRecords() {
      return clone(collections.period_records);
    },
    callFunctionRejects(error) {
      functionError = error;
    },
    callFunctionResolves(result) {
      functionError = null;
      functionResult = { result };
    },
    storageSnapshot() {
      return Object.fromEntries(
        Array.from(storage.entries()).map(([key, value]) => [key, clone(value)]),
      );
    },
  };
}

module.exports = { createWxMock };
