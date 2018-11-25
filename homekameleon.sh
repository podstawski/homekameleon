#!/bin/ash

cd `dirname $0`

if [ -d /tmp/conf ]
then 
	cp ./conf/ios.json /tmp/conf
	cp ./conf/colct.db /tmp/conf
fi

# --max_old_space_size=30
node --expose-gc --max_old_space_size=50 app >/tmp/homekameleon.log 2>>/tmp/homekameleon.err &
sleep 60
counter=0

while [ "1" = "1" ]
do
	echo "$counter" > /tmp/homekameleon.hb.test
	touch /tmp/homekameleon.hb.test
	sleep 45 
	if [ /tmp/homekameleon.hb.test -nt /tmp/homekameleon.hb ]
	then
		counter=`expr $counter + 1`
		killall -TERM node
		sleep 5
		killall -9 node
		sleep 1
		echo "Restart `date`" >>/tmp/homekameleon.err
		if [ "$counter" = "10" ]
		then
			/homekameleon/fsync.sh 1
			echo `date` >> /homekameleon/reboot.log
			reboot
			exit
		fi
		storage_size=`ls -al ./conf/ios.json |awk '{print $5}'`
		tmp_size=`ls -al /tmp/conf/ios.json |awk '{print $5}'`
		if [ $storage_size -gt $tmp_size ]
		then
			cd ./conf
			git checkout buffer.json
			cd `dirname $0`
			cp ./conf/ios.json /tmp/conf
		fi	
		node --expose-gc --max_old_space_size=50 app >/tmp/homekameleon.log 2>>/tmp/homekameleon.err &
		echo `date` >> /homekameleon/restart.log
		sleep 60
	fi

done
