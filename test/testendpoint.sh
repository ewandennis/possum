#!/bin/sh
curl -H 'Content-type: application/json' -X POST http://localhost:3000/endpoints/0 -d @allevents.json -v

curl -X GET http://localhost:3000/endpoints/0 | jq .

