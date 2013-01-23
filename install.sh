# install.sh

# download Rocket
sudo git clone -b "deploy" https://github.com/carlcalderon/Rocket.git /usr/local/lib/rocket;

# create global symlink
sudo ln -s /usr/local/lib/rocket/rocket /usr/local/bin/rocket
