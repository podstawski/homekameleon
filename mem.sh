#!/bin/sh

memfile=/tmp/mem.prom

while [ "1" = "1" ]
do

	pid=`ps x|grep node |grep -v grep | awk '{print $1}'`
	mem=`cat /proc/$pid/status |grep VmSize | awk '{print $2}'`
	prev=`cat $memfile`

	echo $mem > $memfile

	delta=`expr $mem - $prev`


	touch /tmp/promienko.mem
	if [ $delta -gt 0 ]
	then
		echo "`date`, delta=$delta" >> /tmp/promienko.mem
	fi

	sleep 60
done
