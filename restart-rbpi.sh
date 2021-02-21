#!/bin/sh

sudo killall -TERM homekameleon.sh
sudo killall -TERM node
sleep 1
sudo /homekameleon/fsync.sh
sudo rm -f /tmp/homekameleon.err /tmp/homekameleon.log
sudo /homekameleon/homekameleon.sh &
