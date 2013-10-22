# CollectionFS split into multiple packages

NOTE: This is a work-in-progress repo that will eventually be split into multiple repos/packages. Don't use it except for testing it.

## collectionFS

The core package to manage files in your app, including uploading and downloading.

## collectionFS-handlebars

Handlebars helpers for the core package.

## cfs-storage-gridFS

GridFS storage adaptor.

## cfs-storage-s3

S3 storage adaptor.

## cfs-storage-filesystem

Local filesystem storage adaptor.

## cfs-fileobject-gm

Extends FileObject, making it trivial to manipulate images in your beforeSave method prior to saving each copy.
