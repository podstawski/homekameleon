#!/bin/sh

cd `dirname $0`

while [ "1" = "1" ]
do
	# --max_old_space_size=30
	node --expose-gc --max_old_space_size=45 app >>/sd/homekameleon.log 2>>/sd/homekameleon.err 
	echo "Restart `date`" >>/sd/homekameleon.err
	killall -TERM ssh
	sleep 1
done
