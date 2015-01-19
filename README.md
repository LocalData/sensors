# LocalData Sensors API
An API for lightweight, time-series data streams

## Usage

### Create a source

```
POST /api/v1/sources
```

The POST can be empty or can have an `application/json` body with the following structure:

```
{
  "data" : {
    "field1" : "some value",
    "field2" : "maybe an e-mail address?"
  }
}
```

The fields under `data` are optional and flexible. They're intended to convey source metadata, like the email address of the user creating the source, a device name for the source, etc.

The response contains the client ID for the source as well as a secret access token for sending sensor data:

```
{
  "id": "ci4omwt7k0003nm0u92mt03al",
  "token": "43721161-e044-48e5-af64-7f3761c8f3a9"
}
```

### Get source info

```
GET /api/v1/sources/ci4omwt7k0003nm0u92mt03al
```

Response:
```
{
  "id": "ci4omwt7k0003nm0u92mt03al",
  "data": {
    "name": "Prashant Singh",
    "email": "email@somedomain.com",
    "device": "Roboto 2000",
    "city": "San Francisco"
  }
}
```

### Send data

Sending data requires the authorization token, formatted into a bearer token authorization header. If the token is `43721161-e044-48e5-af64-7f3761c8f3a9`, then the bearer string comes from the Base64 encoding of `:43721161-e044-48e5-af64-7f3761c8f3a9` (a colon prepended to the token). This is modeled after Heroku's token-based authorization and allows the use of a username/id in the Bearer string if needed later. For this example, the authorization header would be:
```
Authorization: Bearer OjQzNzIxMTYxLWUwNDQtNDhlNS1hZjY0LTdmMzc2MWM4ZjNhOQ==
```

A sample POST might be
```
POST /api/v1/sources/ci4omwt7k0003nm0u92mt03al/entries HTTP/1.1
Host: localdata-sensors.herokuapp.com
Content-Type: application/json
Authorization: Bearer OjQzNzIxMTYxLWUwNDQtNDhlNS1hZjY0LTdmMzc2MWM4ZjNhOQ==

{
  "timestamp": 1420754284000, "air": 1.5, "uv": 0.3, "temp": 44.2, "location": [-122.4136490,37.7756410]
}
```

### Read data

Read data in pages, in ascending chronological order:
```
GET /api/v1/sources/ci4omwt7k0003nm0u92mt03al/entries?startIndex=0&count=10
```

Get the latest 10 results (read data in pages, in descending chronological order):
```
GET /api/v1/sources/ci4omwt7k0003nm0u92mt03al/entries?startIndex=0&count=10&sort=desc
```

## Dependencies

The API stores data in a PostgreSQL database. It uses the JSON datatype but does not currently use the PL/V8 language extension.

## Tests

Tests use a `test.env` file to configure environment variables. See
`test.env.sample` for an example. Run tests with
```
make test
```

## Migrations

The Sequelize configurations point to the `DATABASE_URL` environment variable. Run migrations against the test db locally with

```
envrun -e test.env --path node_modules/.bin/sequelize db:migrate
```

Or use `node_modules/.bin/envrun` if you don't have envrun installed globally.
