#!/bin/sh

while [ "1" = "1" ]
do
	node --max_old_space_size=20 app >>/sd/promienko.log 2>>/sd/promienko.err 
	echo "Restart `date`" >>/sd/promienko.err
	killall -TERM ssh
	sleep 1
done
