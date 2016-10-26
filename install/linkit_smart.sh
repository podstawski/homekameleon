#!/bin/sh


TMP=/tmp/linikit_smart_install.txt

if [ ! -f /usr/lib/git-core/git ]
then
	ln -s $(which git) /usr/lib/git-core/git
fi	


sed "s/:80'/:8080'/g"  < /etc/config/uhttpd > $TMP
mv $TMP /etc/config/uhttpd

sed 's/DNS_SERVERS=""/DNS_SERVERS="8.8.8.8"/g' </etc/init.d/dnsmasq > $TMP
mv $TMP /etc/init.d/dnsmasq

sed "s/option hostname 'mylinkit'/option hostname 'homekameleon'/g" < /etc/config/system > $TMP
mv $TMP /etc/config/system

sed "s#option timezone 'UTC'#option zonename 'Europe/Warsaw'\n	option timezone 'CET-1CEST,M3.5.0,M10.5.0/3'#g" < /etc/config/system > $TMP
mv $TMP /etc/config/system

rm /etc/rc.local
ln -s /homekameleon/rc.local /etc/rc.local


opkg update
opkg install sqlite3-cli
opkg install openvpn-openssl



