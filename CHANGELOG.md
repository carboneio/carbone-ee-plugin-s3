# Changelog

All notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.1.0
- Released the 2024/03/01
- Specify a custom-named configuration file by creating the environment variable `CARBONE_S3_CONFIG`; the default filename is config.json.
- Specify a custom path to the configuration file by creating the environment variable `CARBONE_S3_CONFIG_PATH`; the default path is the Carbone Server directory `./config`.


## 1.0.0 
- Released the 2024/01/15
- Added storage.js to store templates and renders into S3.
- Added tests
- Compatible with Carbone API v4.X.X