#!/bin/ash

touch /tmp/piwnica

for i in $(seq 2 95)
do
	ping -c 1 -w 1 192.168.0.$i >/dev/null &
done

wait

ip=`cat /proc/net/arp | grep $1 | awk '{print $1}'`
echo "$1 = $ip" >/tmp/piwnica

etherwake $1

if [ "$ip" ]
then
	ssh -o ConnectTimeout=3 pudel@$ip sudo halt -p 2>/dev/null
fi
