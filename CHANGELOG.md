# Change Log

## 2.1.0

- Added `onDeepInterceptedChange` to handle changes -before- they happen.
- Added `UndoManager`. (Note: If you are using the `Y.js` binding you should still use its own undo manager wherever possible).

## mobx-bonsai-yjs 2.1.0

- `yjsOrigin` parameter in `bindYjsToNode` now accepts either a `symbol` or a `() => symbol` function. When a function is provided, it will be called dynamically to retrieve the current origin symbol for each transaction, allowing for runtime origin symbol selection.

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
