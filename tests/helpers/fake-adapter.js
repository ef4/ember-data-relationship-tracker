import JSONAPIAdapter from '@ember-data/adapter/json-api';

export default JSONAPIAdapter.extend({
  createRecord(store, type) {
    return {
      data: {
        id: 1,
        type: type.modelName,
        attributes: {}
      }
    };
  },
  updateRecord(store, type) {
    return {
      data: {
        id: 1,
        type: type.modelName,
        attributes: {}
      }
    };
  }
});
