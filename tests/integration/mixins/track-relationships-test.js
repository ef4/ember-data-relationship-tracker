import Model, { hasMany, belongsTo, attr } from '@ember-data/model';
import { run } from '@ember/runloop';
import { resolve, all } from 'rsvp';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import TrackRelationships from 'ember-data-relationship-tracker';
import FakeAdapter from '../../helpers/fake-adapter';

let post, editor, comment;

module('Integration | Mixin | track relationships', function(hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function() {
    this.owner.register('model:post', Model.extend(TrackRelationships, {
      title: attr('string'),
      comments: hasMany(),
      pendingComments: hasMany('comments'),
      author: belongsTo(),
      editor: belongsTo('author')
    }));
    this.owner.register('model:comment', Model.extend({
      body: attr('string')
    }));
    this.owner.register('model:author', Model.extend({
      name: attr('string')
    }));
    this.owner.register('adapter:post', FakeAdapter);
    this.owner.register('adapter:author', FakeAdapter);
    this.owner.register('adapter:comment', FakeAdapter);
    this.store = this.owner.lookup('service:store');

    return resolve().then(() => {
      editor = this.get('store').createRecord('author', { name: 'E' });
      comment = this.get('store').createRecord('comment', { body: 'first post' });
      post = this.get('store').createRecord('post');
      post.set('title', 'initial title');
      post.set('editor', editor);
      post.set('pendingComments', [comment]);
      return all([post.save(), editor.save(), comment.save()]);
    });
  });

  test('hasDirtyFields starts out false', function(assert) {
    assert.equal(post.get('hasDirtyFields'), false);
  });

  test('hasDirtyFields reflects attribute dirtying', function(assert) {
    run(() => {
      post.set('title', 'x');
    });
    assert.equal(post.get('hasDirtyFields'), true);
  });

  test('hasDirtyFields reflects attribute un-dirtying', function(assert) {
    run(() => {
      post.set('title', 'x');
    });
    run(() => {
      post.set('title', 'initial title');
    });
    assert.equal(post.get('hasDirtyFields'), false);
  });

  test('hasDirtyFields reflects belongsTo initial set', function(assert) {
    run(() => {
      post.watchRelationship('author', () => {
        post.set('author', this.store.createRecord('author'));
      });
    });
    assert.equal(post.get('hasDirtyFields'), true);
  });

  test('hasDirtyFields reflects belongsTo un-dirtying to empty', function(assert) {
    run(() => {
      post.watchRelationship('author', () => {
        post.set('author', this.store.createRecord('author'));
      });
    });
    run(() => {
      post.watchRelationship('author', () => {
        post.set('author', null);
      });
    });
    assert.equal(post.get('hasDirtyFields'), false);
  });

  test('hasDirtyFields reflects belongsTo change', function(assert) {
    run(() => {
      post.watchRelationship('editor', () => {
        post.set('editor', this.store.createRecord('author'));
      });
    });
    assert.equal(post.get('hasDirtyFields'), true);
  });

  test('hasDirtyFields reflects belongsTo un-dirtying to previous value', function(assert) {
    run(() => {
      post.watchRelationship('editor', () => {
        post.set('editor', this.store.createRecord('author'));
      });
    });
    run(() => {
      post.watchRelationship('editor', () => {
        post.set('editor', editor);
      });
    });
    assert.equal(post.get('hasDirtyFields'), false);
  });

  test('can roll back belongsTo to empty', function(assert) {
    run(() => {
      post.watchRelationship('author', () => {
        post.set('author', this.store.createRecord('author'));
      });
    });
    run(() => {
      post.rollbackRelationships();
    });
    assert.equal(post.get('hasDirtyFields'), false);
    return post.get('author').then(a => {
      assert.equal(a, null);
    });
  });

  test('can roll back belongsTo to previous value', function(assert) {
    run(() => {
      post.watchRelationship('editor', () => {
        post.set('editor', this.store.createRecord('author'));
      });
    });
    run(() => {
      post.rollbackRelationships();
    });
    assert.equal(post.get('hasDirtyFields'), false);
    return post.get('editor').then(a => {
      assert.equal(a, editor);
    });
  });

  test('hasDirtyFields reflects hasMany initial set', function(assert) {
    run(() => {
      post.watchRelationship('comments', () => {
        post.set('comments', [this.store.createRecord('comment')]);
      });
    });
    assert.equal(post.get('hasDirtyFields'), true);
  });

  test('hasDirtyFields reflects hasMany un-dirtying to empty', function(assert) {
    run(() => {
      post.watchRelationship('comments', () => {
        post.set('comments', [this.store.createRecord('comment')]);
      });
    });
    run(() => {
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
});

module('Integration | Mixin | track relationships as Class', function(hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function() {
    class PostModel extends Model.extend(TrackRelationships) {
      @attr('string') title;
      @hasMany() comments;
      @hasMany('comments') pendingComments;
      @belongsTo() author;
      @belongsTo('author') editor;
    }
    this.owner.register('model:post', PostModel);
    class CommentModel extends Model {
      @attr('string') body
    }
    this.owner.register('model:comment', CommentModel);
    class AuthorModel extends Model {
      @attr('string') name;
    }
    this.owner.register('model:author', AuthorModel);
    this.owner.register('adapter:post', FakeAdapter);
    this.owner.register('adapter:author', FakeAdapter);
    this.owner.register('adapter:comment', FakeAdapter);
    this.store = this.owner.lookup('service:store');

    return resolve().then(() => {
      editor = this.get('store').createRecord('author', { name: 'E' });
      comment = this.get('store').createRecord('comment', { body: 'first post' });
      post = this.get('store').createRecord('post');
      post.set('title', 'initial title');
      post.set('editor', editor);
      post.set('pendingComments', [comment]);
      return all([post.save(), editor.save(), comment.save()]);
    });
  });

  test('hasDirtyFields starts out false', function(assert) {
    assert.equal(post.get('hasDirtyFields'), false);
  });

  test('hasDirtyFields reflects attribute dirtying', function(assert) {
    run(() => {
      post.set('title', 'x');
    });
    assert.equal(post.get('hasDirtyFields'), true);
  });

  test('hasDirtyFields reflects attribute un-dirtying', function(assert) {
    run(() => {
      post.set('title', 'x');
    });
    run(() => {
      post.set('title', 'initial title');
    });
    assert.equal(post.get('hasDirtyFields'), false);
  });

  test('hasDirtyFields reflects belongsTo initial set', function(assert) {
    run(() => {
      post.watchRelationship('author', () => {
        post.set('author', this.store.createRecord('author'));
      });
    });
    assert.equal(post.get('hasDirtyFields'), true);
  });

  test('hasDirtyFields reflects belongsTo un-dirtying to empty', function(assert) {
    run(() => {
      post.watchRelationship('author', () => {
        post.set('author', this.store.createRecord('author'));
      });
    });
    run(() => {
      post.watchRelationship('author', () => {
        post.set('author', null);
      });
    });
    assert.equal(post.get('hasDirtyFields'), false);
  });

  test('hasDirtyFields reflects belongsTo change', function(assert) {
    run(() => {
      post.watchRelationship('editor', () => {
        post.set('editor', this.store.createRecord('author'));
      });
    });
    assert.equal(post.get('hasDirtyFields'), true);
  });

  test('hasDirtyFields reflects belongsTo un-dirtying to previous value', function(assert) {
    run(() => {
      post.watchRelationship('editor', () => {
        post.set('editor', this.store.createRecord('author'));
      });
    });
    run(() => {
      post.watchRelationship('editor', () => {
        post.set('editor', editor);
      });
    });
    assert.equal(post.get('hasDirtyFields'), false);
  });

  test('can roll back belongsTo to empty', function(assert) {
    run(() => {
      post.watchRelationship('author', () => {
        post.set('author', this.store.createRecord('author'));
      });
    });
    run(() => {
      post.rollbackRelationships();
    });
    assert.equal(post.get('hasDirtyFields'), false);
    return post.get('author').then(a => {
      assert.equal(a, null);
    });
  });

  test('can roll back belongsTo to previous value', function(assert) {
    run(() => {
      post.watchRelationship('editor', () => {
        post.set('editor', this.store.createRecord('author'));
      });
    });
    run(() => {
      post.rollbackRelationships();
    });
    assert.equal(post.get('hasDirtyFields'), false);
    return post.get('editor').then(a => {
      assert.equal(a, editor);
    });
  });

  test('hasDirtyFields reflects hasMany initial set', function(assert) {
    run(() => {
      post.watchRelationship('comments', () => {
        post.set('comments', [this.store.createRecord('comment')]);
      });
    });
    assert.equal(post.get('hasDirtyFields'), true);
  });

  test('hasDirtyFields reflects hasMany un-dirtying to empty', function(assert) {
    run(() => {
      post.watchRelationship('comments', () => {
        post.set('comments', [this.store.createRecord('comment')]);
      });
    });
    run(() => {
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
});
