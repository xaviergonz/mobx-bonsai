# Change Log

## 2.0.0

- Y.js bindings have been moved into a separate `mobx-bonsai-yjs` package. This solves issues when using the Y.js bindings on a ESM module environment.
- Errors thrown by Y.js bindings will be now of type `MobxBonsaiYjsError` instead of `MobxBonsaiError`.

## 1.1.2

- Fix so that reassigning a same value won't invalidate an snapshot.

## 1.1.1

- Make Yjs dependency truly optional.

## 1.1.0

- Added an `extends` method to node types so that they can extend other node types.
- `applyPlainObjectToYMap` / `applyPlainArrayToYArray` are no longer wrapped in mobx actions in case they want to track the original values.

## 1.0.0

- Initial public release.
