#!/bin/sh


TMP=/tmp/linikit_smart_install.txt


sed "s/:80'/:8080'/g"  < /etc/config/uhttpd > $TMP
mv $TMP /etc/config/uhttpd

sed 's/DNS_SERVERS=""/DNS_SERVERS="8.8.8.8"/g' </etc/init.d/dnsmasq > $TMP
mv $TMP /etc/init.d/dnsmasq

