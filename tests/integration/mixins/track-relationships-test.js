import Ember from 'ember';
import { moduleForComponent, test } from 'ember-qunit';
import DS from 'ember-data';
import TrackRelationships from 'ember-data-relationship-tracker';
import FakeAdapter from '../../helpers/fake-adapter';
const { Model, attr, belongsTo, hasMany } = DS;

let post, editor, comment;

moduleForComponent('track-relationships', 'Integration | Mixin | track relationships', {
  integration: true,
  beforeEach() {
    this.register('model:post', Model.extend(TrackRelationships, {
      title: attr('string'),
      comments: hasMany(),
      pendingComments: hasMany('comments'),
      author: belongsTo(),
      editor: belongsTo('author')
    }));
    this.register('model:comment', Model.extend({
      body: attr('string')
    }));
    this.register('model:author', Model.extend({
      name: attr('string')
    }));
    this.register('adapter:post', FakeAdapter);
    this.register('adapter:author', FakeAdapter);
    this.register('adapter:comment', FakeAdapter);
    this.inject.service('store');

    return Ember.RSVP.resolve().then(() => {
      editor = this.get('store').createRecord('author', { name: 'E' });
      comment = this.get('store').createRecord('comment', { body: 'first post' });
      post = this.get('store').createRecord('post');
      post.set('title', 'initial title');
      post.set('editor', editor);
      post.set('pendingComments', [comment]);
      return Ember.RSVP.all([post.save(), editor.save(), comment.save()]);
    });
  }
});

test('hasDirtyFields starts out false', function(assert) {
  assert.equal(post.get('hasDirtyFields'), false);
});

test('hasDirtyFields reflects attribute dirtying', function(assert) {
  Ember.run(() => {
    post.set('title', 'x');
  });
  assert.equal(post.get('hasDirtyFields'), true);
});

test('hasDirtyFields reflects attribute un-dirtying', function(assert) {
  Ember.run(() => {
    post.set('title', 'x');
  });
  Ember.run(() => {
    post.set('title', 'initial title');
  });
  assert.equal(post.get('hasDirtyFields'), false);
});

test('hasDirtyFields reflects belongsTo initial set', function(assert) {
  Ember.run(() => {
    post.watchRelationship('author', () => {
      post.set('author', this.store.createRecord('author'));
    });
  });
  assert.equal(post.get('hasDirtyFields'), true);
});

test('hasDirtyFields reflects belongsTo un-dirtying to empty', function(assert) {
  Ember.run(() => {
    post.watchRelationship('author', () => {
      post.set('author', this.store.createRecord('author'));
    });
  });
  Ember.run(() => {
    post.watchRelationship('author', () => {
      post.set('author', null);
    });
  });
  assert.equal(post.get('hasDirtyFields'), false);
});

test('hasDirtyFields reflects belongsTo change', function(assert) {
  Ember.run(() => {
    post.watchRelationship('editor', () => {
      post.set('editor', this.store.createRecord('author'));
    });
  });
  assert.equal(post.get('hasDirtyFields'), true);
});

test('hasDirtyFields reflects belongsTo un-dirtying to previous value', function(assert) {
  Ember.run(() => {
    post.watchRelationship('editor', () => {
      post.set('editor', this.store.createRecord('author'));
    });
  });
  Ember.run(() => {
    post.watchRelationship('editor', () => {
      post.set('editor', editor);
    });
  });
  assert.equal(post.get('hasDirtyFields'), false);
});

test('can roll back belongsTo to empty', function(assert) {
  Ember.run(() => {
    post.watchRelationship('author', () => {
      post.set('author', this.store.createRecord('author'));
    });
  });
  Ember.run(() => {
    post.rollbackRelationships();
  });
  assert.equal(post.get('hasDirtyFields'), false);
  return post.get('author').then(a => {
    assert.equal(a, null);
  });
});

test('can roll back belongsTo to previous value', function(assert) {
  Ember.run(() => {
    post.watchRelationship('editor', () => {
      post.set('editor', this.store.createRecord('author'));
    });
  });
  Ember.run(() => {
    post.rollbackRelationships();
  });
  assert.equal(post.get('hasDirtyFields'), false);
  return post.get('editor').then(a => {
    assert.equal(a, editor);
  });
});

test('hasDirtyFields reflects hasMany initial set', function(assert) {
  Ember.run(() => {
    post.watchRelationship('comments', () => {
      post.set('comments', [this.store.createRecord('comment')]);
    });
  });
  assert.equal(post.get('hasDirtyFields'), true);
});

test('hasDirtyFields reflects hasMany un-dirtying to empty', function(assert) {
  Ember.run(() => {
    post.watchRelationship('comments', () => {
      post.set('comments', [this.store.createRecord('comment')]);
    });
  });
  Ember.run(() => {
    post.watchRelationship('comments', () => {
      post.set('comments', []);
    });
  });
  assert.equal(post.get('hasDirtyFields'), false);
});

test('hasDirtyFields reflects hasMany change', function(assert) {
  return post.get('pendingComments').then(pc => {
    post.watchRelationship('pendingComments', () => {
      pc.pushObject(this.store.createRecord('comment'));
    });
    assert.equal(post.get('hasDirtyFields'), true);
  });
});

test('hasDirtyFields reflects hasMany un-dirtying to previous value', function(assert) {
  return post.get('pendingComments').then(pc => {
    post.watchRelationship('pendingComments', () => {
      pc.pushObject(this.store.createRecord('comment'));
    });
    post.watchRelationship('pendingComments', () => {
      pc.popObject();
    });
    assert.equal(post.get('hasDirtyFields'), false);
  });
});

test('can roll back hasMany to empty', function(assert) {
  return post.get('comments').then(pc => {
    post.watchRelationship('comments', () => {
      pc.pushObject(this.store.createRecord('comment'));
    });
    post.watchRelationship('comments', () => {
      pc.popObject();
    });
    assert.equal(post.get('hasDirtyFields'), false);
  });
});

test('can roll back hasMany to previous value', function(assert) {
  return post.get('pendingComments').then(pc => {
    assert.deepEqual(pc.map(c => c.get('body')), ["first post"]);
    post.watchRelationship('pendingComments', () => {
      pc.pushObject(this.store.createRecord('comment', { body: 'other' }));
    });
    post.rollbackRelationships();
    assert.equal(post.get('hasDirtyFields'), false);
    return post.get('pendingComments');
  }).then(pc => {
    assert.deepEqual(pc.map(c => c.get('body')), ["first post"]);
  });
});
