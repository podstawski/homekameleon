fsync /sd/conf/*
fsync /sd/logs/*
cp /sd/conf/*.db /homekameleon/conf
cp /sd/conf/ios.json /homekameleon/conf
fsync /homekameleon/conf
touch /tmp/homekameleon.fsync

if [ "$1" = "" ]
then
	#exit
	echo
fi

sleep 5
killall -TERM node
sleep 5
reboot

