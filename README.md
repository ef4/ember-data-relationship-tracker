# Ember-data-relationship-tracker

Track ember data relationships to know if records are dirty.

## Problem

`isDirty` works great on ember data records if any of the attributes have changed. But it doesn't track relationship changes at all. This is because relationships are very complex and it's very hard to know if they are actually dirty or if they've just changed to reflect server state, e.g. because a new related record has been loaded.

## Solution

`ember-data-relationship-tracker` allows you to explicitly mark pieces of code where you might change relationships. This gives you a `hasDirtyFields` property on your models that lets you know if any attributes _or relationships_ have changed so you can reflect this in your UI.

In order to safely distinguish new versions from the server vs new edits in the client, you must provide a `version` field on your model. It can be a computed property or a real field, but it must be a unique value that changes whenever the server provides a new version.

## Example

```js
// watch a section of code that might change relationships
post.watchRelationship('comments', () => {
  post.set('comments', someComments);
});

post.get('hasDirtyFields'); // true if comments has changed (or any other attribute has changed)

// rollback relationships to previous state
post.rollbackRelationships();
```
Works for `belongsTo` and `hasMany` relationships, and also knows if you set the relationships back to the original state and sets the property to false again.

See [the tests](https://github.com/ef4/ember-data-relationship-tracker/blob/master/tests/integration/mixins/track-relationships-test.js) for more examples.

Installation
------------------------------------------------------------------------------

* `git clone <repository-url>` this repository
* `cd ember-data-relationship-tracker`
* `npm install`

### Linting

* `npm run lint:js`
* `npm run lint:js -- --fix`

### Running tests

* `ember test` – Runs the test suite on the current Ember version
* `ember test --server` – Runs the test suite in "watch mode"
* `ember try:each` – Runs the test suite against multiple Ember versions

### Running the dummy application

* `ember serve`
* Visit the dummy application at [http://localhost:4200](http://localhost:4200).

For more information on using ember-cli, visit [https://ember-cli.com/](https://ember-cli.com/).

License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).
