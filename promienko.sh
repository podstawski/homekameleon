#!/bin/sh

cd `dirname $0`

while [ "1" = "1" ]
do
	node --expose-gc --max_old_space_size=30 app >>/sd/promienko.log 2>>/sd/promienko.err 
	echo "Restart `date`" >>/sd/promienko.err
	killall -TERM ssh
	sleep 1
done
