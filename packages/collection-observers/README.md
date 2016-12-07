cfs:collection-observers
=========================

This is a Meteor package used by
[CollectionFS](https://github.com/CollectionFS/Meteor-CollectionFS).

You don't need to manually add this package to your app. It is added when you
add the `cfs:standard-packages` package.

## Overview
This package triggers an FSCollection to emit events by observing for specific changes. In a multi-instance system this package needs to be running from a single instance to avoid duplicate events.

## Observer Reference:
- FSCollection document removed
- All stores complete
