#!/bin/sh

while [ "1" = "1" ]
do

	ssh -nT -o TCPKeepAlive=yes -o ServerAliveInterval=60 -R 4022:localhost:22 home@home.webkameleon.com /home/home/home.sh 4022
	sleep 5
done
