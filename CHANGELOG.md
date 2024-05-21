# Changelog

All notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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