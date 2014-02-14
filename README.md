cfs-tempstore
=========================

This is a Meteor package used by
[CollectionFS](https://github.com/CollectionFS/Meteor-CollectionFS). It provides
an API for quickly storing chunks of file data in temporary files on the
server OS. If also supports deleting those chunks, and combining them into one
binary object and attaching it to an FS.File instance.

You don't need to manually add this package to your app, but you could replace
this package with your own if you want to handle temporary storage in another
way.