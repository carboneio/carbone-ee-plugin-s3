# S3 Plugin for Carbone On-premise

Store your templates and generated document into S3 (AWS, OVHCloud, scaleway, and any S3 provider).

## Requirements
- Install Node 18
- Create 2 S3 Buckets to store `templates` and `renders` (generated documents).
- Create a S3 user accessing the `templates` and `renders` buckets. 

## Setup

Create a `plugin` directory in the same directory as the `carbone-ee` binary.
```sh
mkdir plugin
```
Enter into the `plugin` directory
```sh
cd plugin
```
Clone the repository
```sh
git clone https://github.com/carboneio/carbone-ee-plugin-s3.git
```
Install Npm Packages
```sh
npm install
```
Provide S3 configurations, as environment variables:
```dotenv
AWS_SECRET_ACCESS_KEY=ACCESS_KEY_ID
AWS_ACCESS_KEY_ID=SECRET_KEY
AWS_ENDPOINT_URL=s3.paris.api.url
AWS_REGION=paris
BUCKET_RENDERS="BUCKET NAME to store your generated documents"
BUCKET_TEMPLATES="BUCKET NAME to store your templates"
```

If you are using **Carbone Docker**, you have to mount the plugin directory a volume into the container, and you have to define environment variable for S3 credentials

Command for Docker CLI:
```sh
docker run --platform linux/amd64 --name carbone -p 4000:4000 -e LANG=C.UTF-8 -v ./plugin:/app/plugin -e AWS_SECRET_ACCESS_KEY='ACCESS_KEY' -e AWS_ACCESS_KEY_ID='SECRET_KEY' -e AWS_ENDPOINT_URL='s3.paris.api.url' -e AWS_REGION='paris' -e BUCKET_RENDERS='bucket_renders' -e BUCKET_TEMPLATES='bucket_templates' carbone/carbone-ee
```

File for Docker-compose:
```yml
version: "3.9"
services:
  carbone:
    image: carbone/carbone-ee:latest
    platform: linux/amd64
    ports:
      - "4000:4000"
    volumes:
      - ./plugin:/app/plugin
    environment:
      - LANG=C.UTF-8
      - AWS_SECRET_ACCESS_KEY=ACCESS_KEY_ID
      - AWS_ACCESS_KEY_ID=SECRET_KEY
      - AWS_ENDPOINT_URL=s3.paris.api.url
      - AWS_REGION=paris
      - BUCKET_RENDERS="bucket_renders"
      - BUCKET_TEMPLATES="bucket_templates"
```

Finally start the Carbone Server, and the following logs will appear. If the connection fails or something goes wrong, an error message will be logged.

```sh
- Additional plugin parameters detected: storageCredentials, rendersBucket, templatesBucket in config.json file
- Loading plugin storage.js
- Storage ok | s3.paris.api.url | paris | Status 200 | Buckets: [ RENDERS_CONTAINER_NAME ][ TEMPLATES_CONTAINER_NAME ]
```
## Environment Variables

The plugin supports the following environment variables to change the configuration file name and path:
* `CARBONE_S3_CONFIG`: Specify a custom-named configuration file; the default filename is `config.json`.
* `CARBONE_S3_CONFIG_PATH`: Specify a custom path to the configuration file; the default path is the Carbone Config directory `./config`.