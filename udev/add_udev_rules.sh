#! /bin/bash

sudo cp *.rules /etc/udev/rules.d/
echo 'Copying udev rules inside /etc/udev/rules.d/'
echo 'Notifying udevadm and reloading rules'
sudo udevadm trigger
sudo udevadm control --reload-rules
echo 'Adding plugdev group for udev rules'
sudo groupadd plugdev
echo 'Adding' $USER 'to the plugdev group'
sudo usermod -aG plugdev `whoami`
echo 'Done! You can now run Dux Reserve key manager beta :)'
echo 'Vires in Numeris'
