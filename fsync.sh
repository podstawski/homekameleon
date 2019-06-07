#!/bin/ash

cp /tmp/conf/*.db /homekameleon/conf
cp /tmp/conf/ios.json /homekameleon/conf
chown pi /homekameleon/conf/* 2>/dev/null
touch /tmp/homekameleon.fsync 2>/dev/null

