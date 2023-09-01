#!/bin/bash

if [ $# -lt 1 ]; then
    echo "Usage: $0 <number> [username] [password]"
    echo "  -nd: No debugging info mode"
    echo "If username and password are provided, they will be used to authenticate"
    exit 1
fi

param=$1
username=""
password=""

if [ $# -ge 2 ]; then
    username="-u $2"
fi

if [ $# -ge 3 ]; then
    password="-s $3"
fi

if ! [[ $param =~ ^[0-9]+$ ]]; then
    echo "Invalid parameter: Please provide a valid number"
    exit 1
fi

port=$((8080 + param))
dbfile="test${param}.db"

DEBUG=routing,server,client,database,cache node bin/testApp.js -p $port -db ./data/$dbfile -i term $username $password
