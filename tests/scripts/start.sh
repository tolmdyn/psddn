#!/bin/bash

debug_cmd="DEBUG=routing,server,client,database,cache,dht"

debug_flag=true
param=""
username=""
password=""

function show_usage {
    echo "Usage: $0 <number> [username] [password]"
    echo "  -nd: No debugging info mode"
    echo "If username and password are provided, they will be used to authenticate"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -nd)
            debug_flag=false
            shift
            ;;
        *)
            if [ -z "$param" ]; then
                param=$1
            elif [ -z "$username" ]; then
                username="-u $1"
            elif [ -z "$password" ]; then
                password="-s $1"
            else
                show_usage
            fi
            shift
            ;;
    esac
done

if [ -z "$param" ]; then
    show_usage
fi

if ! [[ $param =~ ^[0-9]+$ ]]; then
    echo "Invalid parameter: Please provide a valid number"
    exit 1
fi

port=$((8080 + param))
dbfile="test${param}.db"


if [ $debug_flag = false ]; then
    debug_cmd=""
fi

port=$((8080 + param))
dbfile="test${param}.db"

command="$debug_cmd node bin/testApp.js -p $port -db ./data/$dbfile -i term $username $password"
eval $command
