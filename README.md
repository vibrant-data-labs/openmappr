# OpenMappr 📊
> Data Visualization

## Documentation
### Development Guides
* [Prerequisites Install Guide for macOS](https://github.com/selfhostedworks/openmappr/wiki/Prerequisites-Install-Guide-for-macOS)
* [Prerequisites Install Guide for Ubuntu](https://github.com/selfhostedworks/openmappr/wiki/Prerequisites-Install-Guide-for-Ubuntu)
* [Prerequisites Install Guide for Fedora](https://github.com/selfhostedworks/openmappr/wiki/Prerequisites-Install-Guide-for-Fedora)
* [Validating Local Dependencies](https://github.com/selfhostedworks/openmappr/wiki/Validating-Local-Dependencies)

** Windows is not supported officially at this time.
### Deployment Guides
* [How to connect to an Openmappr server](https://github.com/selfhostedworks/openmappr/wiki/How-to-connect-to-an-Openmappr-server)
* [How to deploy a production server](https://github.com/selfhostedworks/openmappr/wiki/How-to-deploy-a-production-server)
* [How to use a local or remote Mongo host](https://github.com/selfhostedworks/openmappr/wiki/How-to-use-a-local-or-remote-Mongo-host)
* [How to integrate Sendgrid for feedback](https://github.com/selfhostedworks/openmappr/wiki/How-to-integrate-Sendgrid-for-feedback)

## Running Locally
First you need to install the following prerequisites.  The installation instructions may vary based on your operating system, but a guide for macOS can be found [here](https://github.com/selfhostedworks/openmappr/wiki/macOS-Prerequisites-Install-Guide).
* Git
* Docker & Docker Compose
* Node.js 8.12.0 ([nvm](https://github.com/nvm-sh/nvm) is recommended)
* NPM along with `yo`, `bower`, and `grunt-cli`
* Ruby along with the `sass` and `compass` gems


Then you will want to download or clone the project, and open up a terminal inside the project folder.
```bash
git clone https://github.com/selfhostedworks/openmappr.git
cd openmappr
```
After doing so, run the following commands to install all the dependencies:
```bash
npm install
bower install
```
To build the client and perform JS ops, run:
```bash
grunt
``` 
Next you will want to run the following command to bring up the local docker compose stack:
```bash
docker-compose -f docker-compose.local.yml up -d
```
After it finishes, you can start the server with:
```bash
./run_local_mode.sh
```
And navigate to [localhost:8080](http://localhost:8080) with your web browser.

## Exiting Local Development
To shut down the development server, press `ctrl`+`c` to exit, and then run `docker-compose down` to shut down the docker stack.
