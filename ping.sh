#!/bin/sh

ping -q -c 1 `netstat -r |grep 0.0.0.0|awk '{print $2}'` >/dev/null
