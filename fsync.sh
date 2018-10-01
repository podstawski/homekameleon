#!/bin/ash

cp /tmp/conf/*.db /homekameleon/conf
cp /tmp/conf/ios.json /homekameleon/conf
fsync /homekameleon/conf/*
touch /tmp/homekameleon.fsync

if [ "$1" = "1" ]
then
	reboot
fi
