#!/bin/sh

cd `dirname $0`

if [ -d /tmp/conf ]
then 
	cp ./conf/ios.json /tmp/conf
	cp ./conf/colct.db /tmp/conf
fi

# --max_old_space_size=30
node --expose-gc --max_old_space_size=45 app >/tmp/homekameleon.log 2>>/tmp/homekameleon.err &
sleep 60
counter=0

while [ "1" = "1" ]
do
	echo "$counter" > /tmp/homekameleon.hb.test
	touch /tmp/homekameleon.hb.test
	sleep 20
	if [ /tmp/homekameleon.hb.test -nt /tmp/homekameleon.hb ]
	then
		counter=`expr $counter + 1`
		pid=`cat /tmp/homekameleon.pid`
		#kill -TERM $pid
		killall -TERM node
		sleep 2
		#kill -9 $pid
		killall -9 node
		sleep 1
		echo "Restart `date`" >>/tmp/homekameleon.err
		if [ "$counter" = "5" ]
		then
			/homekameleon/fsync.sh 1
			exit
		fi
		node --expose-gc --max_old_space_size=45 app >/tmp/homekameleon.log 2>>/tmp/homekameleon.err &
		sleep 60
	fi

done
