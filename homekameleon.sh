#!/bin/sh

cd `dirname $0`

if [ -d /sd/conf ]
then 
	cp ./conf/ios.json /sd/conf
	cp ./conf/colct.db /sd/conf
fi

# --max_old_space_size=30
node --expose-gc --max_old_space_size=45 app >/tmp/homekameleon.log 2>>/tmp/homekameleon.err &
sleep 10

while [ "1" = "1" ]
do
	touch /tmp/homekameleon.hb.test
	sleep 10
	if [ /tmp/homekameleon.hb.test -nt /tmp/homekameleon.hb ]
	then
		pid=`cat /tmp/homekameleon.pid`
		kill -TERM $pid
		sleep 2
		kill -9 $pid
		sleep 1
		echo "Restart `date`" >>/tmp/homekameleon.err
		node --expose-gc --max_old_space_size=45 app >/tmp/homekameleon.log 2>>/tmp/homekameleon.err &
		sleep 10
	fi

done
