#!/bin/bash
# Dev server with simple test credentials
#
# Admin:  username=admin   password=admin
# Family: username=family  password=family

# Unset first to prevent empty-string inheritance from parent shell overriding .env.local
unset ADMIN_PASSWORD FAMILY_PASSWORD SESSION_SECRET

export ADMIN_USER=admin
export ADMIN_PASSWORD='$2b$10$usnjkHCO6Sn8UVfyyT6n5eUU90ChpZSkCz0wFYeTpSFAfqygwH9Sm'
export FAMILY_USER=family
export FAMILY_PASSWORD='$2b$10$kMz6SfcOR57MT3PTc.CvKeUJEHPheAA/lUTWRDUV4WKvR33b4dhxS'
export SESSION_SECRET=dev-secret-not-for-production-use-32-chars-minimum-pad
export UNIFI_MOCK=true
export DEV_ADMIN_PASSWORD=admin
export DEV_FAMILY_PASSWORD=family

echo "Dev server — test credentials:"
echo "  admin  / admin"
echo "  family / family"
echo ""

npm run dev
