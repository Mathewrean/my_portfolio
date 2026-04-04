---
title: Kerberos Practical
updated: 2026-02-02 06:24:11Z
created: 2026-01-12 21:30:04Z
---

## **1. Install Required Packages**
`sudo apt update 
sudo apt install krb5-kdc krb5-admin-server krb5-user`

```
krb5-user → client commands (kinit, klist)
krb5-kdc → authentication server, Ticket Granting Server
krb5-admin-server → manages users (principals)
```
* * *
**2. Configuring Kerberos Realm**
`Purpose: Tell Kerberos what realm exists and where the KDC is.`
```
The config file is contained at:
`sudo nano /etc/krb5.conf`

```

Our configs:
```                                
[libdefaults]
    default_realm = JOOUST.COM
    dns_lookup_kdc = false
    dns_lookup_realm = false
    ticket_lifetime = 24h
    renew_lifetime = 7d
    forwardable = true
    rdns = false // Helps in avoiding common hostname issues
    udp_preference_limit = 0 //forces TCP for reliabilility

[realms]
    JOOUST.COM = {
        kdc = localhost
        admin_server = localhost
        default_domain = jooust.com
    }

[domain_realm]
    .jooust.com = JOOUST.COM
    jooust.com = JOOUST.COM

[logging]
    default = FILE:/var/log/krb5libs.log
    kdc = FILE:/var/log/krb5kdc.log
    admin_server = FILE:/var/log/kadmind.log


```

Apply -> `sudo systemctl restart krb5-kdc krb5-admin-server`


**3. Create Kerberos Database**
Initialize the KDC database (stores all principals & keys).
`sudo krb5_newrealm`
```What happens:
Creates /var/lib/krb5kdc/principal
Sets master key
Starts KDC services
```

**4. Verify if it is running**
`sudo systemctl status krb5-kdc
sudo systemctl status krb5-admin-serve`

**5. Add Administrative Principal**
```
Create a Kerberos admin (can manage users):
sudo kadmin.local

Inside kadmin.local:
addprinc admin/admin

Enter a strong password.
Exit with:
quit

```
**6. Test Kerberos Authentication**
```
Get a ticket for your admin principal:
kinit admin/admin

Check ticket:
klist

Should show a valid TGT (Ticket Granting Ticket) with expiry.
```

7. Add a regular principal (user)
```
sudo kadmin.local
addprinc mathewrean

Set password.

Test with:
kinit mathewrean
klist
```











```
1. Create new realm database
sudo kdb5_util create -s -r JOOUST.COM

2. Restart services
sudo systemctl restart krb5-kdc krb5-admin-server

3. Recreate principals
sudo kadmin.local
addprinc admin/admin
addprinc mathewrean
quit

4. Test
kinit mathewrean
klist


Expected:

Default principal: mathewrean@JOOUST.COM
krbtgt/JOOUST.COM@JOOUST.COM
```



## Configurations for new changes made to the kerberos
Make root system writable
`sudo mount -o remount,rw /`

**1. Stop Kerberos services**
`sudo systemctl stop krb5-kdc krb5-admin-server`

**2. Remove existing database + stash**
```
Safe for lab/testing. Required to re-initialize.
NB: Ensure you are a root user to perform the task below
```

```
sudo rm -f /var/lib/krb5kdc/principal*
sudo rm -f /etc/krb5kdc/stash
sudo rm -f /var/log/krb5kdc.log

```

Verify empty:
`sudo ls -l /var/lib/krb5kdc/`


