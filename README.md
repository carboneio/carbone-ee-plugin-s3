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
Now move to the parent directory, and add 3 configurations to the `config/config.json`:
```js
{
    "storageCredentials": [
        {
            "accessKeyId": "ACCESS_KEY_ID",
            "secretAccessKey": "SECRET_KEY",
            "url": "s3.paris.api.url",
            "region": "paris"
        }
    ],
    "rendersBucket": "RENDERS_CONTAINER_NAME",
    "templatesBucket": "TEMPLATES_CONTAINER_NAME"
}
```
Now start the Carbone On-premise binary, and the following logs will appear. If the connection fails or something goes wrong, an error message will be logged.

```sh
- Additional plugin parameters detected: storageCredentials, rendersBucket, templatesBucket in config.json file
- Loading plugin storage.js
- Storage ok | s3.paris.api.url | paris | Status 200 | Buckets: [ RENDERS_CONTAINER_NAME ][ TEMPLATES_CONTAINER_NAME ]
```
## Environment Variables

The plugin supports the following environment variables to change the configuration file name and path:
* `CARBONE_S3_CONFIG`: Specify a custom-named configuration file; the default filename is `config.json`.
* `CARBONE_S3_CONFIG_PATH`: Specify a custom path to the configuration file; the default path is the Carbone Config directory `./config`.