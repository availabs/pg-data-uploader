#!/bin/bash

set -e

SRC='INRIX/'

SCHEMA=ny
TABLE=inrix_shapefile

ogr2ogr \
  -f PostgreSQL \
  PG:"host=localhost port=5434 user=npmrds_explorer dbname=npmrds_sandbox password=sandbox" \
  $SRC \
  -nlt MULTILINESTRING \
  -lco SCHEMA="$SCHEMA" \
  -nln "$TABLE" \
