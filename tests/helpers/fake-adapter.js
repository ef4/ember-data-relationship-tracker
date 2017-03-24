import DS from 'ember-data';

export default DS.JSONAPIAdapter.extend({
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
