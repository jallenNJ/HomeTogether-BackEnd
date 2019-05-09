# HomeTogether-BackEnd

## Introduction
This is a RESTful API webserver implemented in NodeJS which connects to the MongoDB database. The server makes use of many modules, most important of which is the express module as it handles most of the basic services of a server. Authentication is self-written from the project; however, it makes use of the Bcrypt library for salting, hashing, and comparing hashes. 

## Installation Instructions
1.	Install NodeJS. The server was written with version 8.11.4
2.	Clone the repo with all the code
3.	Run the command npm install to get all the dependencies from the package.json
4.	Set up the environment as listed in the below sub section
5.	Run the server with npm start
	
## Environment Vars
The environment gets loaded in from the .env file placed in the root directory with the package.json. The .env file needs a field called “noSqlDatabase” and its value is the connection string to the MongoDB database.
Operator Manual
Once the server is running, it is self-sufficient on its own. Any calls to a route will output the response code and the time it took to generate it in the console. The server does accept console input during runtime, the two commands which are fully working are: ip and exit. 

### IP
The ip command causes the server to print out its IP address to console
### Exit
The exit command causes the server to safely exit. This is better than using control c to kill the server as it allows for everything to be properly closed off and flushed.

## Database information
The MongoDB makes uses of two primary collections: users and Households. These are always guaranteed to exists, as when the server connects to the database, it will make them if they do not currently exist. 

### User Collection
The user collection is the database collection which holds all the user account information, which consists of the Mongo Object ID, the username, and the hashed password. This collection is used primarily for authentication.

### Household Collection
This is the collection where most of the manipulation happens. A household object contains:

* The ID of the household

* The name of the household

* A list of all member IDs

* The locations in their pantry

* An array of all items in the pantry

A pantry item contains the following information:
* Name of the item
* Amount of the item
* The items category
* An array of the item’s tags
* The date of when it expires
