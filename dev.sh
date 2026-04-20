#!/bin/bash
# Dev server with simple test credentials
#
# Admin:  username=admin   password=admin
# Family: username=family  password=family

export ADMIN_USER=admin
export ADMIN_PASSWORD='$2b$10$usnjkHCO6Sn8UVfyyT6n5eUU90ChpZSkCz0wFYeTpSFAfqygwH9Sm'
export FAMILY_USER=family
export FAMILY_PASSWORD='$2b$10$kMz6SfcOR57MT3PTc.CvKeUJEHPheAA/lUTWRDUV4WKvR33b4dhxS'
export SESSION_SECRET=dev-secret-not-for-production-use-32-chars-minimum-pad

echo "Dev server — test credentials:"
echo "  admin  / admin"
echo "  family / family"
echo ""

npm run dev
