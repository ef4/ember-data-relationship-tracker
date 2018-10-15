import { or, gt } from '@ember/object/computed';
import { computed, get } from '@ember/object';
import Mixin from '@ember/object/mixin';
import isEqual from 'lodash/isEqual';

export default Mixin.create({
  init() {
    this._super();
    this._relationshipTracker = Object.create(null);
  },

  async save() {
    await this._super(...arguments);
    this.notifyPropertyChange('relationshipTrackerVersion');
  },

  watchRelationship(field, fn) {
    let entry = this._relationshipTracker[field];
    if (!entry) {
      entry = this._relationshipTracker[field] = Object.create(null);
    }
    let version = versionKey(this);
    if (!(version in entry)) {
      entry[version] = currentState(this, field);
    }
    fn();
    this.notifyPropertyChange('dirtyRelationships');
  },

  hasDirtyRelationships: gt('dirtyRelationships.length', 0),

  hasDirtyFields: or('hasDirtyAttributes', 'hasDirtyRelationships'),

  dirtyRelationships: computed('relationshipTrackerVersion', function() {
    let version = versionKey(this);
    let dirty = [];
    this._forEachRelationship(field => {
      let entry = this._relationshipTracker[field];
      let relationshipChanged = (version in entry) && !isEqual(entry[version], currentState(this, field));
      if (relationshipChanged) {
        dirty.push(field);
      }
    });
    return dirty;
  }),

  rollbackRelationships() {
    let version = versionKey(this);
    let tracker = this._relationshipTracker;
    this._forEachRelationship(field => {
      if (!tracker[field] || !(version in tracker[field])) { return; }
      this.set(field, tracker[field][version]);
    });
    this.notifyPropertyChange('dirtyRelationships');
  },

  _forEachRelationship(fn) {
    let tracker = this._relationshipTracker;
    Object.keys(tracker).forEach(field => {
      fn(field);
    });
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

function versionKey(model) {
  let version = model.get('relationshipTrackerVersion');
  if (!version) {
    return -1;
  }
  if (typeof version.getTime === 'function') {
    return version.getTime();
  }
  return version;
}
