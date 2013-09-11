#Client api
The basics operations are uploading, downloading and removing files.

##Server
Firstly we have an option to use a remote fileserver, this does require some more work if wanting to use security.

##Uploading file
This is the dificult part where we are at risk of loosing files and users. This should be really easy and have an option for resuming fileuploads even if we rebooted the client.

##User interface component
The user can upload files via a "upload component" - it's part of the `CollectionFS` helpers and can be configured to suite most common use cases eg.:
* File input
* Drag n' drop files into a container
* Paste files into a container

##Features
Some of the buildin features:
* The user can resume upload if browser crashed
* Files are cancelable - we can regret and upload anther file

#Strategies
When the user does this we can setup an upload strategy for the user:
* Securitywise we use the Meteor `allow` and `deny` rules
* Throttle - we can allow only a single file at a time, multiple files
* Types, size and more can be restricted pr. `CollectionFS` to only allow certain files


##Downloading file
Theres different ways to download files, we have options:
* Download blob via ddp from file server
* Http links that is served by a file server