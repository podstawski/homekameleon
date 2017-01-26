fsync /sd/conf/*
fsync /sd/logs/*
cp /sd/conf/*.db /homekameleon/conf
cp /sd/conf/ios.json /homekameleon/conf
fsync /homekameleon/conf
touch /tmp/homekameleon.fsync
