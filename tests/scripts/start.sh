#!/bin/bash

if [ $# -ne 1 ]; then
    echo "Usage: $0 <number>"
    exit 1
fi

param=$1

if ! [[ $param =~ ^[0-9]+$ ]]; then
    echo "Invalid parameter: Please provide a valid number"
    exit 1
fi

port=$((8080 + param))
dbfile="test${param}.db"

DEBUG=server,client,database,cache node bin/testApp.js -p $port -db ./data/$dbfile -i term