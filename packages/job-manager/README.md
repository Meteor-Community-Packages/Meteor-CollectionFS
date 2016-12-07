cfs:job-manager
=========================

This is a Meteor package used by
[CollectionFS](https://github.com/CollectionFS/Meteor-CollectionFS).

You don't need to manually add this package to your app. It is added when you
add the `cfs:standard-packages` package.

## Overview

The job and queue functionality is an implementation of [vsivsi:job-collection](https://github.com/vsivsi/meteor-job-collection), a "powerful and easy to use job manager designed and built for Meteor.js."

Job Manager creates jobs by listening to events emitted in other cfs packages. These jobs are completed by worker groups established by the [cfs:worker](https://github.com/CollectionFS/Meteor-CollectionFS/tree/master/packages/worker) package.

## Job Task Reference:
- saveCopy
- removeTempFile
- removeStoredData
