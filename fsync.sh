fsync /sd/conf/*
fsync /sd/logs/*
if [ -s /sd/conf/ios.json ]
then
	cp /sd/conf/*.db /homekameleon/conf
	cp /sd/conf/ios.json /homekameleon/conf
	fsync /homekameleon/conf
fi
touch /tmp/homekameleon.fsync
