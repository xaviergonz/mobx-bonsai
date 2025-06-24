# Change Log

## 1.1.2

- Fix so that reassigning a same value won't invalidate an snapshot.

## 1.1.1

- Make Yjs dependency truly optional.

## 1.1.0

- Added an `extends` method to node types so that they can extend other node types.
- `applyPlainObjectToYMap` / `applyPlainArrayToYArray` are no longer wrapped in mobx actions in case they want to track the original values.

## 1.0.0

- Initial public release.
