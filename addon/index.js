import { or } from '@ember/object/computed';
import { computed, get } from '@ember/object';
import Mixin from '@ember/object/mixin';
import isEqual from 'lodash/isEqual';

export default Mixin.create({
  init() {
    this._super();
    this._relationshipTracker = Object.create(null);
  },

  watchRelationship(field, fn) {
    let entry = this._relationshipTracker[field];
    if (!entry) {
      entry = this._relationshipTracker[field] = Object.create(null);
    }
    let changed = changedKey(this);
    if (!(changed in entry)) {
      entry[changed] = currentState(this, field);
    }
    fn();
    this.notifyPropertyChange('hasDirtyRelationships');
  },

  hasDirtyRelationships: computed('changed', function() {
    let changed = changedKey(this);
    return Object.keys(this._relationshipTracker).some(field => {
      let entry = this._relationshipTracker[field];
      return (changed in entry) && !isEqual(entry[changed], currentState(this, field));
    });
  }),

  hasDirtyFields: or('hasDirtyAttributes', 'hasDirtyRelationships'),

  rollbackRelationships() {
    let changed = changedKey(this);
    let tracker = this._relationshipTracker;
    Object.keys(tracker).forEach(field => {
      if (!tracker[field] || !(changed in tracker[field])) { return; }
      this.set(field, tracker[field][changed]);
    });
    this.notifyPropertyChange('hasDirtyRelationships');
  }

});

function currentState(model, field) {
  let config = get(model.constructor, 'relationshipsByName').get(field);
  if (config.kind === 'hasMany') {
    let reference = model.hasMany(field);
    let refValue = reference.value();
    return refValue ? refValue.toArray() : [];
  } else {
    let reference = model.belongsTo(field);
    return reference.value();
  }
}

function changedKey(model) {
  let changed = model.get('changed');
  if (changed) {
    return changed.getTime();
  } else {
    return -1;
  }
}
