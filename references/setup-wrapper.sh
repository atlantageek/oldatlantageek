#!/bin/bash
. /etc/bashrc
menu() {
  clear
  echo `date`
  echo
  MenuTitle
  echo
  echo " 1) Run Setup App"
  echo " 2) Update Application"
  echo " 3) Restart Server"
  echo " 4) Configure Server Time"
  echo " 5) Backup System"
  echo ""
  echo " 80) Change Password"
  echo " 90) exit"
  echo 
  echo "ENTER YOUR SELECTION:"
}
inputloop() {

   while true
   do
   menu
   read answer
   case $answer in
   1)
     RunSetup
   ;;
   2)
     UpdateYum
   ;;
   3)
     RestartServer
   ;;
   4)
     ConfigureServerTime
   ;;
   80)
     /usr/bin/passwd
   ;;
   90)
     exit
   ;;
   *)
      inputloop
   ;;
   esac
   echo ""
   echo ""
   read -p 'Press ENTER to continue ==> '
   done

}

MenuTitle() {
echo "Welcome to your Admin console, please select an action."
echo "Please select action:"
}

RunSetup() {
  /usr/bin/sudo /usr/bin/setup
  /usr/bin/sudo /sbin/ifdown eth0
  /usr/bin/sudo /sbin/ifup eth0
  /usr/bin/sudo /sbin/ifdown eth1
  /usr/bin/sudo /sbin/ifup eth1
}


UpdateYum() {
  /usr/bin/sudo /usr/bin/yum clean all < /dev/null
  /usr/bin/sudo /usr/bin/yum -y update < /dev/null
  /usr/bin/sudo /sbin/service nginx-serv restart < /dev/null
  /usr/bin/sudo /sbin/chkconfig --add mongrel_cluster_serv
  /usr/bin/sudo /sbin/chkconfig  mongrel_cluster_serv on
  /usr/bin/sudo /sbin/chkconfig --add flash_policy_daemon
  /usr/bin/sudo /sbin/chkconfig  mongrel_cluster_serv on
}

RestartServer() {
  /usr/bin/sudo /sbin/service nginx-serv restart 2>/dev/null
  /usr/bin/sudo /sbin/service mongrel_cluster_serv restart 2>/dev/null
}


ConfigureServerTime() {
  echo "Now Time is "`date +"%m/%d/%Y %H:%M:%S"`
  ret=1
  quit=0
  while [ $ret != 0 ]
  do
    echo "Please input new time(yyyymmdd hh:mm:ss), type 'q' to quit"
    read new_day
    if [[ $new_day = 'q' ]] || [[ $new_day = "" ]]; then
      return
    fi
    /usr/bin/sudo /bin/date --set "$new_day" 1>/dev/null 2>/dev/null
    ret=$?
    if [ $ret = 1 ]; then
      echo "Wrong time format"
    else
      echo "Now Time is "`date +"%m/%d/%Y %H:%M:%S"`
    fi
  done
}

inputloop
