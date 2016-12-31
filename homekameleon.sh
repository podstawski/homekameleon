#!/bin/sh

cd `dirname $0`

while [ "1" = "1" ]
do
	# --max_old_space_size=30
	node --expose-gc --max_old_space_size=45 app >>/sd/logs/homekameleon.log 2>>/sd/logs/homekameleon.err 
	echo "Restart `date`" >>/sd/logs/homekameleon.err
	killall -TERM ssh
	sleep 1
done
