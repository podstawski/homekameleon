#!/bin/sh


TMP=/tmp/linkit_smart_install.txt
HOMEKAMELEON=/homekameleon

if [ ! -f /usr/lib/git-core/git ]
then
	ln -s $(which git) /usr/lib/git-core/git
fi	

rm -rf /root/.npm
mkdir /tmp/.npm 2>/dev/null
ln -s /tmp/.npm /root/.npm


sed "s/:80'/:8080'/g"  < /etc/config/uhttpd > $TMP
mv $TMP /etc/config/uhttpd

sed 's/DNS_SERVERS=""/DNS_SERVERS="8.8.8.8"/g' </etc/init.d/dnsmasq > $TMP
mv $TMP /etc/init.d/dnsmasq
chmod 755 /etc/init.d/dnsmasq

sed "s/option hostname 'mylinkit'/option hostname 'homekameleon'/g" < /etc/config/system > $TMP
mv $TMP /etc/config/system

sed "s#option timezone 'UTC'#option zonename 'Europe/Warsaw'\n	option timezone 'CET-1CEST,M3.5.0,M10.5.0/3'#g" < /etc/config/system > $TMP
mv $TMP /etc/config/system

sed "/config wifi-iface 'ap'/,/option seq '1'/d" </etc/config/wireless >$TMP
if [ "`cmp /etc/config/wireless $TMP`" ]
then
	echo "
config wifi-iface 'ap'
        option device 'radio0'
        option mode 'ap'
        option network 'lan'
        option ifname 'ra0'
        option ssid 'homekameleon'
        option key 'homekameleon'
	option encryption 'psk2'
	option seq '1'
" >> $TMP

	mv $TMP /etc/config/wireless
fi


rm /etc/rc.local
ln -s $HOMEKAMELEON/rc.local /etc/rc.local



opkg update
opkg install sqlite3-cli
opkg install openvpn-openssl

cd $HOMEKAMELEON
npm install 

ln -s /sd/conf
ln -s /sd/logs




