# Changelog

All notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.6.0
- Fixed: Generated documents are always saved in S3 with the Render ID as filename, even if the `reportName` rendering option is provided. Before, a document rendered with `reportName` could not be downloaded once it was no longer in the local cache (`404 File not found`), and two documents with the same `reportName` were overwriting each other in the bucket.
- Fixed: If S3 credentials are missing while `BUCKET_TEMPLATES/templatesBucket` or `BUCKET_RENDERS/rendersBucket` are provided, the plugin does not crash on the first request anymore: buckets are ignored and files are stored locally.
- Fixed: When a generated document is downloaded from the local cache, an error while deleting it from S3 is logged and does not call the callback a second time anymore.
- Fixed: When a generated document is downloaded from S3, an error while deleting it from S3 afterwards is logged and does not fail the download anymore.
- Fixed: The S3 bucket connection error logged at startup does not end with `Response: undefined` anymore, it only shows the status code.
- Fixed: When S3 refuses to delete a generated document (HTTP error status), the error is now logged.
- Fixed: An invalid JSON configuration file is now logged instead of being silently ignored.
- Fixed: Templates and generated documents downloaded from S3 are written into a temporary file, then renamed. Before, a concurrent request could read a partially written file from the local cache.
- Replaced the deprecated `fs.F_OK` with `fs.constants.F_OK`
- Update dev package Mocha to 12.0.3 to fix vulnerabilities of its dependencies (development only, the plugin is not affected). Running the tests requires Node 20.19 or newer.
- Added end-to-end tests with Carbone EE and S3Mock: `npm run test:e2e`

## 1.5.0
- Update package "tiny-storage-client" to support S3 Minio
- Update dev package Mocha and Nock

## 1.4.1
- Released the 2024/05/21
- Fixed: Generated documents are saved in S3 even if the `reportName` rendering option is not provided. It was throwing the error: `Status: 409 | Body: BucketAlreadyOwnedByYou`. Now, the document filename is the Render ID.

## 1.4.0
- Released the 2024/04/30
- S3 Bucket Connection is not listing Buckets anymore, but only verifying if `templatesBucket` and `rendersBucket` are accessible with a `HEAD /bucket` request. If options `BUCKET_TEMPLATES/templatesBucket` or `BUCKET_RENDER/rendersBucket` are missing, it won't try to connect.

## 1.3.0
- Released the 2024/04/29
- Fixed S3 Credential as Environment Variable

## 1.2.1
- Released the 2024/04/24
- Fixed: if S3 credentials are missing, the plugin is not stopping the Carbone server process anymore.
- Fixed: If options `BUCKET_TEMPLATES/templatesBucket` or `BUCKET_RENDER/rendersBucket` are missing, it won't print warnings anymore.

## 1.2.0
- Released the 2024/04/24
- Added: You can now provide configurations as Environment variables:
  * **S3 Credentials:** AWS_SECRET_ACCESS_KEY, AWS_ACCESS_KEY_ID, AWS_ENDPOINT_URL, AWS_REGION
  * **Bucket name for storing templates:** BUCKET_TEMPLATES
  * **Bucket name for storing generated documents:** BUCKET_RENDERS
- Fixed: If options `BUCKET_TEMPLATES/templatesBucket` or `BUCKET_RENDER/rendersBucket` are missing, Carbone server will still work. Before it was stopping the process.

## 1.1.0
- Released the 2024/03/01
- Specify a custom-named configuration file by creating the environment variable `CARBONE_S3_CONFIG`; the default filename is `config.json`.
- Specify a custom path to the configuration file by creating the environment variable `CARBONE_S3_CONFIG_PATH`; the default path is the Carbone config directory `./config`.


## 1.0.0 
- Released the 2024/01/15
- Added storage.js to store templates and renders into S3.
- Added tests
- Compatible with Carbone API v4.X.X