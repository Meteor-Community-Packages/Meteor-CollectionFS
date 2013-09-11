#Architecture
We should be aware of ways to scale both horisontal and vertical and have the security going along here.

##CFS file access point
This is the point where all files are served and secured, this on both `ddp` and `http`.
The actual data is kept in the `files` file record and chunks / data is accessed by file `storage adapters`:
* Mongodb *(Network connection)*
* Local files *(Native direct access)*
* Fileserver *(Network connection)*
* External fileservers *(Network connection)*

```
Client <---- (ddp/http) --- | CFS access point |
                            |  Security layer  |
                            | Storage adapters |
                              |    |    |    |
                Mongo–––––––––O    |    |    |
                Local––––––––––––––O    |    |
                Fileserver––––––––––––––O    |
                External server––––––––––––––O
```

Serving via ddp or http is again two seperate adapters that allow access via two different protocols.

##Fileserver
The fileserver can be different to the bundle server, this is the pure serving and storing interface. The bundle server would proxi the traffic making sure that only autorized users can access the files accordingly to policy.

##Proxy adapters
The http and the ddp file proxy allows http access to the `CFS access point`, the access point is a universal interface keeping track of security and file locations. *It publishes the files*

```
Client ––> fileId + handlerId + Token + userId ––|
   |                                     ________V_________
   O––––––––––| HTTP |–––––––|          |                  |
                             |––Stream––| CFS access point |
Client <––––––| DDP |––––––––|          |__________________|
   |                                             |
   O_____________Authenticated line _____________O
```

*Each of the `http` and `ddp` packages adds both `client api` and `server proxy adapters`*

The `http` package uses a package called `http-access` this package can be used to publish data at rest points - this way the package could be used for serving collections in `json` or `xml` formats.
Example of the `http-access package`:
```js
  HTTP.methods({
    '/cfs/files/list': function(query) {
      // this.userId
      // Here I can serve raw data on /myList
      return '<b>Hello world</b>';
    }
  });
```

##Filehandlers
The filehandlers part is super powerfull and makes life much easier when caching, handling and converting files to different instances of each file.
File handlers is a external package that uses the file storage adapters to create multiple versions of the uploaded file.
The filehandler is passed two adapters one containing the master and a second containing the output area.
This way one can have files uploaded to the mongo db but have filehandlers create versions on another adapter.

```
File input adapter ––> | filehandlers |–––> Output adapter
(Storage adapter)                          (Storage adapter)
                                              |   |   |
                                              V   V   V
                                           (file versions)
```