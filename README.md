# PSDDN
psddn
A Peer-to-Peer Structured Data Distribution Network

- **bin**/: executable files
    - **app.js**: main executable (view)
- **src**/: source files contained in subdirectories
    - **server**/: server source files (control)
    - **client**/: client source files (control)
    - **cli**/: command line interface source code? (view)
    - **database**/: database related source code (model)
    - **models**/: model/schema definitions and validation (model)
    - **network**/: network related source code (control)
    - **utils**/: shared utility / helper functions
- **test**/: testing code

## CLIENT
### Local actions
- GET - retrieve a local resource
- POST - create a local resource
- DELETE - delete a local resource ?
- LIST - list local resources
- UPDATE - update personal feed

### Remote actions
- REQ - retrieve a specific remote resource
- FEED - update 'subscribed' feed(s)

### --database actions?--
- (view all posts from user?)
- (view all posts from user in a specific group?)
- (view all feeds from a specific group?)
- (view all posts with a specific tag?)

