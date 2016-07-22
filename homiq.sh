#!/bin/sh

if [ ! "$1" ]
then
        exit
fi

pids=`ps x | grep "homiq.sh $1" | grep -v grep | grep -v $$ | awk '{print $1}'`
for p in $pids
do
        kill -TERM $p 2>/dev/null
done

f=/tmp/homiq-$1

while [ "1" = "1" ]
do
        sleep 60
        wget -q -O $f http://localhost:$1/check-web
        ok=`cat $f | grep OK`
        if [ ! "$ok" ]
        then
                exit
        fi
done

