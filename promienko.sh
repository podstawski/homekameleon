#!/bin/sh

cd `dirname $0`

while [ "1" = "1" ]
do
	# --max_old_space_size=30
	node --expose-gc app >>/sd/promienko.log 2>>/sd/promienko.err 
	echo "Restart `date`" >>/sd/promienko.err
	killall -TERM ssh
	sleep 1
done
