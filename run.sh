#!/bin/sh
dn=`dirname $0`
abspath=`cd $dn; pwd`
mvn -q -o -f $abspath/pom.xml exec:java -DscxmlArgs="$*"
