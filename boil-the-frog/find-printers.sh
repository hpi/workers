#!/bin/bash

# Get the list of network printers
printers=$(lpstat -v | grep "://")

# Get the network interface and local network IP range
interface=$(ip route | grep default | awk '{print $5}')
ip_range=$(ip -o -f inet addr show $interface | awk '{print $4}')

# Scan the network for devices with port 631 open (IPP)
nmap_output=$(sudo nmap -p 631 --open $ip_range)

# Get the list of devices on the network with their MAC addresses
devices=$(sudo arp-scan --interface=$interface --localnet)

echo $devices
# Print header
echo -e "Printer URI\t\t\t\t\t\tMAC Address"

# Loop through each printer and find its MAC address
while read -r printer; do
  uri=$(echo $printer | awk '{print $3}')
  host=$(echo $uri | grep -oP '(?<=://)[^/?]+')
  if [[ $host == *.local ]]; then
    ip=$(echo "$nmap_output" | grep -B 2 "$host" | grep "Nmap scan report for" | awk '{print $NF}')
  else
    ip=$(echo "$nmap_output" | grep -B 2 "$host" | grep "Nmap scan report for" | awk '{print $NF}')
  fi
  if [ -n "$ip" ]; then
    mac=$(echo "$devices" | grep $ip | awk '{print $2}')
    echo -e "$printer\t$mac"
  else
    echo -e "$printer\tNot resolved"
  fi
done <<< "$printers"

