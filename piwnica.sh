for i in $(seq 2 50)
do
	ping -c 1 -w 1 192.168.0.$i >/dev/null &
done

wait

ip=`cat /proc/net/arp | grep $1 | awk '{print $1}'`
etherwake $1

ssh -o ConnectTimeout=3 pudel@$ip sudo halt -p
