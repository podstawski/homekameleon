#!/bin/sh

if [ ! -f `dirname $0`/conf/ssh.port ]
then
	exit
fi

dir=`dirname $0`
port=`cat $dir/conf/ssh.port | awk '{print $1}'`


while [ "1" = "1" ]
do

	ssh -nT -o TCPKeepAlive=yes -o ServerAliveInterval=60 -R $port:localhost:22 home@home.webkameleon.com /home/home/home.sh $port
	sleep 5
done
